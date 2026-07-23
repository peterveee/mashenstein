// Production artifact contract for the split gate/game build.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
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
assert(html.includes('mash-install-share') && html.includes('mash-install-arrow')
  && html.includes('icon-180.png'),
  'built iPhone blocker includes the app icon, Share glyph and toolbar pointer');
assert(/window\.__MASH_BUILT_AT__="\\?20\d\d-\d\d-\d\dT/.test(html)
  && html.includes('mash-build-time'),
  'built portrait shell carries and renders its production timestamp');
assert(sw.includes("c.addAll(['./'])") && sw.includes("new URL(req.url)"),
  'existing relative, versioned service worker policy is preserved');
assert(!html.includes('MASHENSTEIN: THE UNPLUGGENING — boot + campaign'),
  'game implementation is not inlined into the live shell');

const buildSource = readFileSync(join(root, 'build/build.js'), 'utf8');
assert(buildSource.includes("dist/.esbuild") && buildSource.includes('buildStamp() + output'),
  'watch server cannot shadow the dev-stamped public game bundle');

console.log(failed ? 'BUILD SHELL: FAILED' : 'BUILD SHELL: OK');
process.exit(failed ? 1 : 0);
