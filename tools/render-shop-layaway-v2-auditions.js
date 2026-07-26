// Render the brighter, staccato After-Hours Layaway v2 pair with sparse
// electronic-machine flourishes. Earlier Layaway auditions remain untouched.
import { mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SHOP_THEME_LAYAWAY_V2_VARIANTS } from '../src/data/shop-themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'shop-theme-auditions');
mkdirSync(outDir, { recursive: true });

for (const variant of SHOP_THEME_LAYAWAY_V2_VARIANTS) {
  const out = join(outDir, `${variant.id}.wav`);
  const rendered = spawnSync(process.execPath, [join(root, 'tools', 'render-track.js'), variant.id, '1', out], {
    cwd: root,
    encoding: 'utf8',
  });
  if (rendered.status !== 0) {
    process.stderr.write(rendered.stderr || rendered.stdout || `Could not render ${variant.id}\n`);
    process.exit(rendered.status || 1);
  }
  process.stdout.write(rendered.stdout);
}
