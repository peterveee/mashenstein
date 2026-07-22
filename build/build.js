// Build: bundle src/main.js (IIFE) and inline it into template.html -> dist/index.html.
// The dist file is fully self-contained and works from file://.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
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

function emit(result) {
  const js = result.outputFiles[0].text;
  const template = readFileSync(join(root, 'build/template.html'), 'utf8');
  // Inline safely: </script> inside the bundle would terminate the tag early.
  const safe = js.replace(/<\/script/gi, '<\\/script');
  // Stamp goes ahead of the bundle so it is set before any module code reads it.
  const html = template.replace('/*__BUNDLE__*/', () => buildStamp() + safe);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), html);
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);

  const releasesDir = join(root, 'releases');
  const originalRelease = existsSync(releasesDir)
    ? readdirSync(releasesDir).filter((f) => f.endsWith('.html')).sort()[0]
    : null;
  if (originalRelease) {
    mkdirSync(join(root, 'dist/v1'), { recursive: true });
    copyFileSync(
      join(releasesDir, originalRelease),
      join(root, 'dist/v1/index.html'),
    );
    console.log(`dist/v1/index.html written from releases/${originalRelease}`);
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
