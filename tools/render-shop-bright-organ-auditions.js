// Render the brighter Checkout Promenade organ pair with sparse bells and
// occasional organ-key glissandi. Existing auditions are left untouched.
import { mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SHOP_THEME_BRIGHT_ORGAN_VARIANTS } from '../src/data/shop-themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'shop-theme-auditions');
mkdirSync(outDir, { recursive: true });

for (const variant of SHOP_THEME_BRIGHT_ORGAN_VARIANTS) {
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
