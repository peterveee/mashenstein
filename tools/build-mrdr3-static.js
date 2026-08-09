// Build the standalone MRDR-3 playground page for deployment.
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = await esbuild.build({
  entryPoints: [join(root, 'tools/mrdr3-entry.js')],
  bundle: true, format: 'iife', target: ['es2020'], minify: false,
  write: false, logLevel: 'warning', outdir: join(root, 'dist'),
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const mixerShell = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8');
const styleStart = mixerShell.indexOf('<style>') + '<style>'.length;
const styleEnd = mixerShell.indexOf('</style>', styleStart);
const style = mixerShell.slice(styleStart, styleEnd);
const shell = readFileSync(join(root, 'tools/mrdr3-shell.html'), 'utf8');
const html = shell.replace('/*__MIXER_STYLE__*/', () => style).replace('/*__BUNDLE__*/', () => js);
const outDir = join(root, 'dist', 'MRDR3');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`dist/MRDR3/index.html written (${(html.length / 1024).toFixed(0)} KB playground)`);

