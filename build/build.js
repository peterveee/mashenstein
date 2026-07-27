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
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The dev server's fixed address: http://192.168.2.37:8001/ on the network, and
// http://127.0.0.1:8001/ on this machine. Change it here and nowhere else.
//
// The PORT is what actually has to be pinned — that is the half esbuild was
// picking at random and the half that moves between runs. The host is left as
// every-interface so both of those URLs answer at once. Naming the LAN address
// here instead does pin the printed URL, but it stops 127.0.0.1 listening
// altogether, which breaks local browsing and every Playwright script that
// drives the game.
const DEV_HOST = '0.0.0.0';
const DEV_PORT = 8001;
// Where the network URL is expected to be, for the startup banner. Purely
// informational — the machine's real address is detected and printed.
const DEV_LAN_HINT = '192.168.2.37';
const watch = process.argv.includes('--watch');

// Load .env if present so MASH_TELEMETRY_URL persists across builds.
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

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

// The install decision runs before game.js is requested, so the game bundle's
// ordinary __MASH_BUILD__ stamp arrives too late to let an iPhone browser
// through. Put a separate boolean in the lightweight HTML shell only for the
// watch/dev build. Production replaces the marker with nothing.
function devGateStamp() {
  return watch ? 'window.__MASH_DEV__=true;' : '';
}

function buildTimestamp() {
  return new Date().toISOString();
}

// The icon sizes the platforms actually ask for: 180 is what iOS wants for a
// Home Screen tile, 192 and 512 are what a web manifest is expected to offer.
// Rendered from the game's own drawing code by tools/render-icon.js.
const ICONS = [180, 192, 512];

// The dev server installs under its own icon and its own manifest. A build
// added to the Home Screen from the watch server was otherwise the same tile
// under the same name as the real one, with nothing to tell them apart on the
// Home Screen or in the app switcher. The dev set is Gary in a magenta
// colourway (tools/render-icon.js); the file names differ too, so the two can
// sit in dist/ at once and a watch build can never quietly overwrite the art
// or the manifest that ships.
const ICON_DIR = watch ? 'build/icons/dev' : 'build/icons';
const iconFile = (size) => (watch ? `icon-dev-${size}.png` : `icon-${size}.png`);
const MANIFEST = watch ? 'manifest-dev.webmanifest' : 'manifest.webmanifest';

// Copy the served icon set into dist, returning the sizes that made it. A dev
// build with no dev art falls back to the production render rather than
// showing a broken image; a missing production size simply has no icon.
function copyIcons(dist) {
  const icons = ICONS.filter((size) => {
    let src = join(root, ICON_DIR, `icon-${size}.png`);
    if (watch && !existsSync(src)) src = join(root, `build/icons/icon-${size}.png`);
    if (!existsSync(src)) return false;
    copyFileSync(src, join(dist, iconFile(size)));
    return true;
  });
  if (icons.length < ICONS.length) {
    console.warn(`${ICON_DIR}: missing sizes — run \`node tools/render-icon.js\``);
  }
  return icons;
}

// What Android reads instead of the <meta> tags iOS reads. Written for dev
// builds too, under its own name, so an installed dev copy gets the dev tile.
function emitManifest(dist, icons) {
  writeFileSync(join(dist, MANIFEST), JSON.stringify({
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
      src: iconFile(size), sizes: `${size}x${size}`, type: 'image/png',
      purpose: size === 512 ? 'any maskable' : 'any',
    })),
  }, null, 2));
  console.log(`dist/${MANIFEST} written (${icons.map(iconFile).join(', ')})`);
}

// The service worker that keeps a Home Screen launch current — the one piece of
// the installed shell a dev build has no use for.
function emitServiceWorker(dist, html, gameJs) {
  // Version = a hash of the page itself, so sw.js changes its own bytes on
  // every real change to the game and stays byte-identical when nothing moved.
  // That byte difference is the only thing a browser checks to decide a worker
  // is new, and a version that churned on every build (a timestamp, say) would
  // reinstall the worker for nothing.
  const version = createHash('sha1').update(html).update(gameJs).digest('hex').slice(0, 10);
  const sw = readFileSync(join(root, 'build/sw.js'), 'utf8').replace('__VERSION__', version);
  writeFileSync(join(dist, 'sw.js'), sw);
  console.log(`dist/sw.js written (build ${version})`);
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
    .replaceAll('__BUILD_TIMESTAMP__', timestamp)
    .replaceAll('__TLM_URL__', process.env.MASH_TELEMETRY_URL || '')
    .replaceAll('__ICON_180__', iconFile(180))
    .replaceAll('__ICON_192__', iconFile(192))
    .replaceAll('__MANIFEST__', MANIFEST)
    .replace('/*__DEV_GATE__*/', devGateStamp());
  // Inline safely: </script> inside the gate would terminate the tag early.
  const safeGate = gateJs.replace(/<\/script/gi, '<\\/script');
  const html = template.replace('/*__GATE_BUNDLE__*/', () => safeGate);
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'index.html'), html);
  writeFileSync(join(dist, 'game.js'), gameJs);
  // Weapon cues are synthesised in-engine now (src/engine/weapon-sfx.js), so
  // there are no audio assets to copy — the game ships as index.html + game.js.
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB gate)`);
  console.log(`dist/game.js written (${(gameJs.length / 1024).toFixed(0)} KB game)`);

  // The icon and manifest an INSTALLED copy needs, and a loose index.html does
  // not: each degrades to nothing if it is missing. Watch builds get their own
  // pair so a Home Screen dev copy is recognisable.
  emitManifest(dist, copyIcons(dist));

  // Watch builds deliberately skip the service worker: a network-first worker
  // is still one more thing between a save and a refresh, and the dev server
  // has nothing to keep current. With no sw.js to fetch, registration 404s
  // and gives up.
  if (!watch) emitServiceWorker(dist, html, gameJs);

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
  // ONE address, every run: http://192.168.2.37:8001/ from a device,
  // http://127.0.0.1:8001/ from here. See DEV_HOST/DEV_PORT above.
  //
  // Called bare, esbuild's serve() picks an ephemeral port and binds wherever it
  // likes, so the URL moved between runs — which breaks every bookmark, every
  // phone tab left open on the last session, and every script that hardcodes it.
  //
  // Override either half for a one-off:
  //   MASH_DEV_HOST=192.168.2.37 MASH_DEV_PORT=8002 npm run dev
  const HOST = process.env.MASH_DEV_HOST || DEV_HOST;
  const PORT = Number(process.env.MASH_DEV_PORT) || DEV_PORT;

  const serveOn = (host) => ctx.serve({ servedir: join(root, 'dist'), host, port: PORT });
  let served;
  let boundHost = HOST;
  try {
    served = await serveOn(HOST);
  } catch (err) {
    const msg = String(err.message);
    // A fixed PORT fails loudly when one is already running, where the old
    // ephemeral-port behaviour would silently start a SECOND server somewhere
    // else — two builds writing one dist/, and a stale tab serving neither. The
    // failure is correct; it just has to say what to do about it.
    if (msg.includes('address already in use')) {
      console.error(`\nPort ${PORT} is already in use — a dev server is probably still running.`);
      console.error(`  see it:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
      console.error(`  stop it: pkill -f 'build/dev.js'`);
      console.error(`  or pick another: MASH_DEV_PORT=8002 npm run dev\n`);
      // Its own code, so the supervisor can tell "someone else has the port,
      // worth retrying while they let go of it" from a real build failure.
      process.exit(3);
    }
    // A named interface only exists while the machine holds that address. DHCP
    // hands out a different one on a different network and the bind fails
    // outright, which would leave no server at all rather than one at the wrong
    // number. Fall back to every interface and say so loudly, because the
    // promised URL is not the one you are getting.
    if (msg.includes('cannot assign requested address') || msg.includes('assign requested')) {
      console.error(`\n${HOST} is not an address this machine currently holds.`);
      console.error('  DHCP has probably moved it. Serving on all interfaces instead.');
      console.error(`  To make it permanent, change DEV_HOST in build/build.js.\n`);
      served = await serveOn('0.0.0.0');
      boundHost = '0.0.0.0';
    } else {
      throw err;
    }
  }
  const { port } = served;
  const lan = Object.values(networkInterfaces()).flat()
    .find((n) => n && n.family === 'IPv4' && !n.internal);
  if (boundHost === '0.0.0.0') {
    console.log(`dev server: http://127.0.0.1:${port}/`);
    if (lan) console.log(`    device: http://${lan.address}:${port}/`);
    // The port is ours to pin; the LAN address is DHCP's to hand out. If it has
    // moved, say so once at startup rather than letting a stale bookmark fail
    // silently on the phone.
    if (lan && lan.address !== DEV_LAN_HINT) {
      console.log(`            (was ${DEV_LAN_HINT} — DHCP moved it; update DEV_LAN_HINT in build/build.js)`);
    }
  } else {
    // Someone named a single interface via MASH_DEV_HOST, so localhost is NOT
    // listening. Print only the URL that actually answers.
    console.log(`dev server: http://${boundHost}:${port}/  (localhost is not bound)`);
  }
} else {
  emit(await esbuild.build(options));
}
