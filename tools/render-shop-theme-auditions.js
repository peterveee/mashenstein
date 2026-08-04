// Render the six audition-only counter themes as individual listening files.
// The counter screens deliberately do not import these candidates yet.
import { mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SHOP_THEME_CANDIDATES } from '../src/data/shop-themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'audio', 'renders', 'auditions', 'shop-theme');
mkdirSync(outDir, { recursive: true });

for (const candidate of SHOP_THEME_CANDIDATES) {
  for (const character of ['dolores', 'gary']) {
    const id = `${candidate.id}-${character}`;
    const out = join(outDir, `${id}.wav`);
    const rendered = spawnSync(process.execPath, [join(root, 'tools', 'render-track.js'), id, '1', out], {
      cwd: root,
      encoding: 'utf8',
    });
    if (rendered.status !== 0) {
      process.stderr.write(rendered.stderr || rendered.stdout || `Could not render ${id}\n`);
      process.exit(rendered.status || 1);
    }
    process.stdout.write(rendered.stdout);
  }
}
