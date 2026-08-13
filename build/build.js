// Build two deliberately separate entry points:
//   gate.js -> inlined into index.html, small enough to decide whether an
//              iPhone may play before any game code or assets are requested.
//   game.js -> requested only after that gate permits the platform.
//
// tools/archive-release.js combines the pair for durable historical snapshots;
// the deployed current build remains split so a browser-only iPhone never
// downloads or evaluates the game.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { hostname, networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
// Watch builds only — see the `plugins` line in `options` below.
import { tunablePlugin } from '../tools/lib/tunable-plugin.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The dev server's fixed address — the same two URLs every run, on every
// network, forever:
//
//     http://localhost:8001/     from this machine
//     http://MBP14.local:8001/   from a phone or tablet on the same wifi
//
// Change the port here and nowhere else.
//
// Both halves of that address have to be pinned deliberately. The PORT is the
// half esbuild picks at random when left alone. The NAME is the half DHCP
// moves: a lease change hands the machine a new 192.168.x.y without warning,
// so any shortcut saved to a bare IP is one router reboot from dead. The
// .local name is Bonjour's, and it follows the machine between networks.
//
// The host is left as every-interface so localhost and the LAN both answer at
// once. Naming a single LAN address here instead does pin the printed URL, but
// it stops 127.0.0.1 listening altogether, which breaks local browsing and
// every Playwright script that drives the game.
const DEV_HOST = '0.0.0.0';
const DEV_PORT = 8001;
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
  // Rewrites the tunable constants from `const` to `let` and hands the dev
  // strip a setter for each, so physics and gait can be moved while the game
  // runs. Watch only: a production bundle keeps `const` and keeps its constant
  // folding in the 60Hz hot path. tests/tunables.js asserts this ternary.
  plugins: watch ? [tunablePlugin()] : [],
  // We write both public outputs ourselves after putting the gate into the
  // template. In watch mode esbuild's serve layer also exposes its in-memory
  // outputs; park those under a private URL so raw /game.js cannot shadow the
  // stamped dist/game.js that enables dev mode.
  outdir: watch ? join(root, 'dist/.esbuild') : join(root, 'dist'),
  write: false,
  // Warnings and errors only in watch mode. At 'info' esbuild's serve layer
  // announces its own private loopback port on startup — a different number
  // every run, printed above the one address this file works to keep fixed,
  // which is precisely the confusion the proxy exists to end. Nothing else is
  // lost: emit() names every file it writes on each rebuild, and a build that
  // fails still prints the failure.
  logLevel: watch ? 'warning' : 'info',
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

// Copy src over dest only when dest is missing or older, and say whether it did.
// The finished things emit() carries along — icons, the manifest, the release
// snapshots — change on the order of never, and a watch build re-emits on every
// save. Writing them each time was harmless but LOOKED like the releases were
// being touched; now the build only writes what is actually stale, and only
// what was written gets a log line.
function copyIfStale(src, dest) {
  if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) return false;
  copyFileSync(src, dest);
  return true;
}

// Copy the served icon set into dist, returning the sizes that made it. A dev
// build with no dev art falls back to the production render rather than
// showing a broken image; a missing production size simply has no icon.
function copyIcons(dist) {
  const icons = ICONS.filter((size) => {
    let src = join(root, ICON_DIR, `icon-${size}.png`);
    if (watch && !existsSync(src)) src = join(root, `build/icons/icon-${size}.png`);
    if (!existsSync(src)) return false;
    copyIfStale(src, join(dist, iconFile(size)));
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
  const body = JSON.stringify({
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
  }, null, 2);
  // Content-compared rather than mtime-compared: the manifest is derived, so it
  // has no source file to be older than. Same bytes, no write, no log line.
  const dest = join(dist, MANIFEST);
  if (existsSync(dest) && readFileSync(dest, 'utf8') === body) return;
  writeFileSync(dest, body);
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
      // The snapshots are finished; a fresh dist gets them once and then the
      // build has nothing to say about them. See copyIfStale.
      if (copyIfStale(src, join(destDir, 'index.html'))) {
        console.log(`dist/${version}/index.html written from releases/${filename}`);
      }
    }
  }
}

// The public dev server: it owns DEV_PORT and forwards everything to esbuild,
// which is listening on loopback somewhere else.
//
// The indirection exists because esbuild's own server will not answer to the
// address we want to bookmark. Since 0.25 it rejects any request whose Host
// header is not `localhost`, `127.0.0.1`, or one of the IPv4 addresses the
// machine held AT THE MOMENT serve() was called. Two consequences, both of
// which look like a broken build rather than a network fact:
//
//   - A .local name is never on that list, so Bonjour — the one name that
//     survives DHCP — is refused outright.
//   - The list is frozen at startup, so a machine that changes network mid
//     session begins answering its own phone with
//     `403 Forbidden: The host "..." is not allowed`, at the very URL that
//     worked an hour ago.
//
// Rewriting Host on the way through sidesteps both: esbuild only ever sees a
// request for 127.0.0.1 and serves it, whatever name the phone asked for.
// Which Host headers the proxy will answer to.
//
// Rewriting Host unconditionally would switch off the protection esbuild's
// check exists to provide, which is against DNS rebinding: a hostile page can
// let its own domain re-resolve to 127.0.0.1, have the browser fetch
// http://evil.example:8001/, and then READ the reply, because as far as the
// browser is concerned the origin is still evil.example. Against a watch build
// that hands over the whole unminified source, sourcemaps and all.
//
// The attack needs a NAME that public DNS can point at a local address, so the
// rule is about names, not addresses:
//
//   - Bare IP literals are safe by construction. A page can only have an IP for
//     an origin if it was served from that IP, which on a private range means
//     the attacker is already inside the network and does not need this.
//   - `.local` is safe by reservation. RFC 6762 gives it to mDNS, so no public
//     resolver will answer for it and it cannot be rebound. Any `.local` is
//     allowed rather than just this machine's, so renaming the Mac cannot
//     silently break the phone.
//   - Every other name is refused — which is exactly the class the attack needs.
//
// Stricter than esbuild in one way (it accepts whatever addresses it saw at
// startup, this refuses public IPs outright) and looser in the way that
// matters: the name survives DHCP, and so does the bookmark.
const PRIVATE_IPV4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function hostAllowed(header) {
  if (!header) return false;
  let host = header.trim().toLowerCase();
  // Strip the port: [::1]:8001 keeps its brackets, name:8001 does not. A bare
  // IPv6 literal has colons of its own, so only unbracketed forms get split.
  if (host.startsWith('[')) {
    host = host.slice(1, host.indexOf(']'));
  } else if (host.split(':').length === 2) {
    host = host.slice(0, host.lastIndexOf(':'));
  }
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  if (PRIVATE_IPV4.test(host)) return true;
  // IPv6 loopback, link-local (fe80::/10) and unique-local (fc00::/7).
  if (host === '::1' || /^fe[89ab]|^f[cd]/.test(host)) return true;
  return false;
}

function startProxy(host, port, upstreamPort) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!hostAllowed(req.headers.host)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end(`403 - the dev server does not answer to the name "${req.headers.host}".\n`
          + 'Reach it on localhost, a .local name, or a private LAN address.\n');
        return;
      }
      const upstream = httpRequest({
        host: '127.0.0.1',
        port: upstreamPort,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` },
        // Live reload holds an SSE connection open for the life of the tab.
        // Its own socket per request keeps that from starving a pool.
        agent: false,
      }, (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        upstreamRes.pipe(res);
      });
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
        res.end('502 - the build server behind this port is not answering.\n');
      });
      req.pipe(upstream);
    });
    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

// Name whoever is sitting on the port, and say when they started. "A dev server
// is probably still running" is unfalsifiable advice when you are certain you
// did not start one — it is usually a forgotten background run, an editor task,
// or another window. A PID and a start time settle it immediately.
function whoHasPort(port) {
  try {
    const opts = { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] };
    const pids = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], opts)
      .split('\n').map((s) => s.trim()).filter(Boolean);
    if (!pids.length) return [];
    return execFileSync('ps', ['-o', 'pid=,lstart=,command=', '-p', pids.join(',')], opts)
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// macOS decides incoming connections per BINARY, not per port, and its firewall
// is on by default. The listening socket used to belong to esbuild's Go binary,
// which has been approved on this machine; it now belongs to node, which may
// not be. An unapproved binary is not refused, it is left hanging, so the
// symptom is a phone that spins forever while localhost is perfectly fine.
//
// Worth knowing even once node is approved: the approval is recorded against an
// absolute path, so upgrading node moves it and the approval has to be redone.
// Best-effort throughout — any trouble reading the firewall means we say
// nothing rather than cry wolf.
function firewallBlocksDevices() {
  if (process.platform !== 'darwin') return false;
  const fw = '/usr/libexec/ApplicationFirewall/socketfilterfw';
  try {
    if (!existsSync(fw)) return false;
    const opts = { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] };
    if (!/State = 1/.test(execFileSync(fw, ['--getglobalstate'], opts))) return false;
    return !execFileSync(fw, ['--listapps'], opts).includes(process.execPath);
  } catch {
    return false;
  }
}

// The name to put on the Home Screen. macOS advertises <LocalHostName>.local
// over Bonjour, which iOS and Android resolve on the same wifi without any
// setup, and which keeps pointing at this machine after DHCP has moved it.
function mdnsName() {
  const name = hostname();
  if (!name || name === 'localhost') return null;
  return name.includes('.') ? name : `${name}.local`;
}

if (watch) {
  const ctx = await esbuild.context({
    ...options,
    // Appended to `options.plugins`, not substituted for them: spreading
    // `options` and then assigning `plugins` would silently drop the tunable
    // rewrite, and the only symptom would be a dev strip whose numbers move
    // while the game ignores them.
    plugins: [...options.plugins, {
      name: 'emit-html',
      setup(build) {
        build.onEnd((result) => { if (!result.errors.length) emit(result); });
      },
    }],
  });
  await ctx.watch();
  // Override either half of the public address for a one-off:
  //   MASH_DEV_HOST=127.0.0.1 MASH_DEV_PORT=8002 npm run dev
  const HOST = process.env.MASH_DEV_HOST || DEV_HOST;
  const PORT = Number(process.env.MASH_DEV_PORT) || DEV_PORT;

  // esbuild gets an ephemeral loopback port. Nothing bookmarks it and nothing
  // off this machine reaches it — the proxy on PORT is the only way in — so the
  // number is free to move between runs. PORT is the half that must not.
  const upstream = await ctx.serve({
    servedir: join(root, 'dist'),
    host: '127.0.0.1',
    port: 0,
  });

  let boundHost = HOST;
  try {
    await startProxy(HOST, PORT, upstream.port);
  } catch (err) {
    // A fixed PORT fails loudly when one is already running, where the old
    // ephemeral-port behaviour would silently start a SECOND server somewhere
    // else — two builds writing one dist/, and a stale tab serving neither. The
    // failure is correct; it just has to say what to do about it.
    if (err.code === 'EADDRINUSE') {
      const holders = whoHasPort(PORT);
      console.error(`\nPort ${PORT} is already in use, held by:`);
      if (holders.length) {
        for (const line of holders) console.error(`  ${line}`);
        console.error('');
      } else {
        console.error('  (could not identify the process — try: '
          + `lsof -nP -iTCP:${PORT} -sTCP:LISTEN)\n`);
      }
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
    if (err.code === 'EADDRNOTAVAIL') {
      console.error(`\n${HOST} is not an address this machine currently holds.`);
      console.error('  DHCP has probably moved it. Serving on all interfaces instead.');
      console.error(`  To make it permanent, change DEV_HOST in build/build.js.\n`);
      await startProxy('0.0.0.0', PORT, upstream.port);
      boundHost = '0.0.0.0';
    } else {
      throw err;
    }
  }

  if (boundHost === '0.0.0.0') {
    const mdns = mdnsName();
    const lan = Object.values(networkInterfaces()).flat()
      .find((n) => n && n.family === 'IPv4' && !n.internal);
    console.log(`dev server: http://localhost:${PORT}/`);
    // Bonjour first, and labelled, because it is the one worth saving: the IP
    // below is only today's lease. Some guest networks block mDNS between
    // clients, which is the one case the IP is still needed for.
    if (mdns) console.log(`    device: http://${mdns}:${PORT}/   <- save this one`);
    if (lan) console.log(`            http://${lan.address}:${PORT}/   (today's lease; it moves)`);
    if (firewallBlocksDevices()) {
      console.log('');
      console.log('  Devices cannot reach this yet: the macOS firewall has not been told');
      console.log('  to let node accept connections, so a phone will hang rather than');
      console.log('  fail. localhost is unaffected. Approve it once, then restart:');
      console.log(`    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add ${process.execPath}`);
      console.log(`    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp ${process.execPath}`);
    }
  } else {
    // Someone named a single interface via MASH_DEV_HOST, so localhost is NOT
    // listening. Print only the URL that actually answers.
    console.log(`dev server: http://${boundHost}:${PORT}/  (localhost is not bound)`);
  }
} else {
  const result = await esbuild.build(options);
  emit(result);

  // The Song Mixer, as a standalone static page at /SongMixer/ — the desk plus the
  // render frame it bounces WAVs through. Only in production builds; watch mode skips
  // it for speed.
  //
  // Through the tool's own builder rather than a copy of it here. While this was a
  // second copy, the two could emit different pages, and the moment the mixer grew a
  // second document that stopped being theoretical: one of them would have shipped a
  // desk whose Render WAV button pointed at a file that was never written.
  try {
    const { buildSongMixer } = await import('../tools/build-mixer-static.js');
    const mixer = await buildSongMixer(root);
    console.log(`dist/SongMixer/index.html written (${mixer.index} KB mixer)`);
    console.log(`dist/SongMixer/render-frame.html written (${mixer.frame} KB engine)`);
  } catch (err) {
    // The mixer is a dev tool; a broken mixer build does not block the game.
    console.error('Song Mixer build failed (the game build is unaffected):');
    console.error(err.message || err);
  }

  // The visualiser, as a standalone page at /visualiser.html. Self-contained: it
  // synthesises its songs through the engine rather than fetching audio, so it needs
  // nothing from the server it is served by and works from any subpath — which is
  // what a project Pages site is.
  //
  // Through the tool's own builder, for the Song Mixer's reason above and for one of
  // its own: that builder is what resolves src/sprites/toons.js and props.js to a
  // stub. A second esbuild call here would quietly ship MASHENSTEIN's whole cast on a
  // public page.
  try {
    const { buildVisualiserHtml } = await import('../tools/build-visualiser.js');
    const { html, version } = await buildVisualiserHtml(root);
    writeFileSync(join(root, 'dist', 'visualiser.html'), html);
    writeFileSync(join(root, 'dist', 'visualiser-version.txt'), `${version}\n`);
    console.log(`dist/visualiser.html written (${(html.length / 1024).toFixed(0)} KB visualiser, build ${version})`);
  } catch (err) {
    console.error('Visualiser build failed (the game build is unaffected):');
    console.error(err.message || err);
  }

  // The public MRDR-3 playground shares the editor, graph, preset and keyboard modules
  // with Song Mixer but gets its own small shell and direct `/MRDR3/` deployment path.
  try {
    const mrdrResult = await esbuild.build({
      entryPoints: [join(root, 'tools/mrdr3-entry.js')],
      bundle: true, format: 'iife', target: ['es2020'], minify: false,
      outdir: join(root, 'dist'), write: false, logLevel: 'warning',
    });
    const mrdrJs = mrdrResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    const mixerSource = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8');
    const styleStart = mixerSource.indexOf('<style>') + '<style>'.length;
    const styleEnd = mixerSource.indexOf('</style>', styleStart);
    const style = mixerSource.slice(styleStart, styleEnd);
    const mrdrShell = readFileSync(join(root, 'tools/mrdr3-shell.html'), 'utf8');
    const mrdrHtml = mrdrShell.replace('/*__MIXER_STYLE__*/', () => style)
      .replace('/*__BUNDLE__*/', () => mrdrJs);
    const mrdrDir = join(root, 'dist', 'MRDR3');
    mkdirSync(mrdrDir, { recursive: true });
    writeFileSync(join(mrdrDir, 'index.html'), mrdrHtml);
    console.log(`dist/MRDR3/index.html written (${(mrdrHtml.length / 1024).toFixed(0)} KB playground)`);
  } catch (err) {
    console.error('MRDR-3 playground build failed:');
    console.error(err.message || err);
  }
}
