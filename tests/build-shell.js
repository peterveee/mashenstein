// Production artifact contract for the split gate/game build.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = spawnSync('node', [join(root, 'build/build.js')], { cwd: root, encoding: 'utf8' });
if (built.status !== 0) {
  console.error(built.stdout, built.stderr);
  process.exit(1);
}

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
const game = readFileSync(join(root, 'dist/game.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'dist/manifest.webmanifest'), 'utf8'));
const sw = readFileSync(join(root, 'dist/sw.js'), 'utf8');
const template = readFileSync(join(root, 'build/template.html'), 'utf8');

assert(manifest.orientation === 'any', 'manifest allows iPad and Android rotation');
assert(statSync(join(root, 'dist/index.html')).size < 50 * 1024, 'initial install gate stays lightweight');
assert(game.length > html.length * 10, 'full game is emitted as a separate deferred bundle');
assert(!template.includes('<canvas id="game"') && !template.includes('fonts.googleapis.com/css2'),
  'initial template contains no game canvas or font stylesheet request');
assert(html.includes('aria-modal') && html.includes('portrait-overlay'),
  'built shell contains accessible install and portrait dialogs');
assert(html.includes('id="boot-error-reload"')
  && html.includes('RELOAD GAME')
  && /#boot-error-reload\s*\{[^}]*position:\s*fixed/s.test(html),
  'built fatal-error panel keeps a reload button at the bottom of the screen');
assert(html.includes('touch-action: none !important')
  && html.includes('-webkit-touch-callout: none !important')
  && html.includes('-webkit-user-drag: none')
  && html.includes('maximum-scale=1, user-scalable=no'),
  'built shell disables native zoom, selection, callout and drag gestures over the canvases');
assert(html.includes('class="mash-portrait-icon"')
  && html.includes('id="portrait-lorenzo-icon"')
  && html.includes('class="mash-portrait-wordmark"')
  && /min-height:\s*100svh/.test(html)
  && !html.includes('id="portrait-overlay-title" data-dialog-heading'),
  'portrait pause screen is full-height, branded and does not force heading focus');
assert(html.includes('<svg class="mash-phone-turn"')
  && html.includes('<g class="mash-phone-turn-device"')
  && html.includes('mash-phone-turn-trail-1')
  && html.includes('mash-phone-turn-trail-2')
  && html.includes('mash-phone-turn-trail-3')
  && html.includes('iPhone 17 Pro body ratio: 150.0 mm tall by 71.9 mm wide')
  && html.includes('<rect x="39" y="46.15" width="112" height="53.7"')
  && !html.includes('mash-phone-turn-arrow')
  && /\.mash-phone-turn\s*\{[^}]*color:\s*#fff/s.test(html)
  && /\.mash-phone-turn rect, \.mash-phone-turn path\s*\{[^}]*stroke-width:\s*6/s.test(html)
  && /@keyframes mash-phone-rotate-cycle\s*\{[^}]*opacity:\s*0;\s*transform:\s*rotate\(-90deg\)/s.test(html)
  && /32%, 84%\s*\{[^}]*opacity:\s*1;\s*transform:\s*rotate\(0deg\)/s.test(html)
  && /@keyframes mash-phone-trail-1[\s\S]*opacity:\s*\.24/.test(html)
  && /@keyframes mash-phone-trail-2[\s\S]*opacity:\s*\.32/.test(html)
  && /@keyframes mash-phone-trail-3[\s\S]*opacity:\s*\.4/.test(html)
  && /prefers-reduced-motion:\s*reduce[\s\S]*\.mash-phone-turn-device\s*\{[^}]*animation:\s*none/s.test(html),
  'built portrait shell rotates an iPhone 17 Pro-proportioned phone with trail and fade');
assert(html.includes('id="copy-error"') && html.includes('id="portrait-error-message"'),
  'built portrait shell contains a copyable crash report');
assert(html.includes('id="portrait-reload"')
  && html.includes('CHECK FOR UPDATE')
  && html.includes('id="portrait-reload-status"'),
  'built portrait shell checks for updates before offering reload confirmation');
assert(html.includes('id="landscape-diag"')
  && html.includes('id="landscape-diag-force-webgl"')
  && html.includes('mash-landscape-diag'),
  'built shell carries the hidden landscape iPad diagnostics panel');
assert(html.includes('mash-install-share') && html.includes('mash-install-arrow')
  && html.includes('icon-180.png'),
  'built iPhone blocker includes the app icon, Share glyph and toolbar pointer');
assert(/window\.__MASH_BUILT_AT__="\\?20\d\d-\d\d-\d\dT/.test(html)
  && html.includes('mash-build-time'),
  'built portrait shell carries and renders its production timestamp');
assert(html.trimEnd().endsWith('<!-- MASHENSTEIN_BUILD_COMPLETE -->'),
  'production shell ends with the update completeness marker');
assert(sw.includes("c.addAll(['./'])") && sw.includes("new URL(req.url)"),
  'existing relative, versioned service worker policy is preserved');
assert(sw.includes("k.startsWith('mashenstein-') && k !== CACHE"),
  'service worker activation only retires MASHENSTEIN caches');
assert(!html.includes('MASHENSTEIN: THE UNPLUGGENING — boot + campaign'),
  'game implementation is not inlined into the live shell');
assert(!html.includes('window.__MASH_DEV__=true') && !html.includes('__DEV_GATE__'),
  'production shell cannot bypass the iPhone installation gate');
assert(!existsSync(join(root, 'dist/audio')),
  'no audio assets are shipped — weapon cues are synthesised in-engine, not fetched');
assert(game.includes('contact-b33p-orb-pop') && game.includes('raymn-rocket-fist-launch'),
  'weapon cue recipes are bundled into the game bundle for procedural playback');

const buildSource = readFileSync(join(root, 'build/build.js'), 'utf8');
assert(buildSource.includes("dist/.esbuild") && buildSource.includes('buildStamp() + output'),
  'watch server cannot shadow the dev-stamped public game bundle');
assert(buildSource.includes("watch ? 'window.__MASH_DEV__=true;' : ''"),
  'watch build marks its lightweight shell for mobile-browser development');

console.log(failed ? 'BUILD SHELL: FAILED' : 'BUILD SHELL: OK');
process.exit(failed ? 1 : 0);
