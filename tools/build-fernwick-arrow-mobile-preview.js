import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['tools/fernwick-arrow-mobile-preview.js'],
  bundle: true,
  format: 'iife',
  write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fernwick arrow · mobile read</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#0b1117;color:#edf3e9;font:14px system-ui,sans-serif}header{max-width:980px;margin:0 auto 18px}h1{margin:0 0 6px;font-size:24px}header p{margin:0;color:#aebfc0;line-height:1.45}main{display:grid;grid-template-columns:repeat(3,312px);gap:14px;justify-content:center}.candidate{padding:12px 0 14px;background:#18242d;border:1px solid #3b4d55;border-radius:10px;overflow:hidden}.candidate h2{margin:0 14px 4px;font-size:16px;letter-spacing:.06em}.candidate p{min-height:34px;margin:0 14px 10px;color:#adc0bd;font:11px ui-monospace,monospace;line-height:1.4}.candidate canvas{display:block;margin:0 auto 8px;image-rendering:pixelated}.candidate-current{border-color:#68777b}.candidate-broadhead{border-color:#a0c66c}.candidate-signal{border-color:#e7bd54}@media(max-width:980px){body{padding:14px}main{grid-template-columns:312px;justify-content:start}}
</style></head><body><header><h1>Fernwick arrow · mobile read</h1><p>Real drawToon() and drawRangedProjectile() at the gameplay 24u, with an enlarged inspection below. BROADHEAD is now the shipped Fernwick treatment; the other two tiles preserve the before-and-after comparison.</p></header><main></main><script>${js}</script></body></html>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/fernwick-arrow-mobile-preview.html', html);
mkdirSync('work/mockups/fernwick-arrow-mobile', { recursive: true });
writeFileSync('work/mockups/fernwick-arrow-mobile/index.html', html);
console.log('dist/fernwick-arrow-mobile-preview.html written');
console.log('work/mockups/fernwick-arrow-mobile/index.html written');
