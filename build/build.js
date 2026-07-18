// Build: bundle src/main.js (IIFE) and inline it into template.html -> dist/index.html.
// The dist file is fully self-contained and works from file://.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  write: false,
  logLevel: 'info',
};

function emit(result) {
  const js = result.outputFiles[0].text;
  const template = readFileSync(join(root, 'build/template.html'), 'utf8');
  // Inline safely: </script> inside the bundle would terminate the tag early.
  const safe = js.replace(/<\/script/gi, '<\\/script');
  const html = template.replace('/*__BUNDLE__*/', () => safe);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), html);
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
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
