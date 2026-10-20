import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await esbuild.build({entryPoints:['tools/vacuum-cube-bakeoff.js'],bundle:true,format:'iife',write:false});
const js = result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>7-2 garbage cube bakeoff</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#14252a;color:#f4eed8;font:16px/1.45 system-ui,sans-serif}header,main{max-width:1720px;margin:auto}h1{font-size:40px;margin:0 0 8px}header p{max-width:880px;color:#bacdc2;margin:0 0 28px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{background:#1b3438;border:1px solid #4a6665;border-radius:12px;overflow:hidden}h2{font-size:24px;letter-spacing:.06em;margin:16px 22px}canvas{display:block;width:100%;height:auto;aspect-ratio:3/2}article p{color:#c2d0c5;margin:16px 22px 20px}@media(max-width:900px){body{padding:16px}main{grid-template-columns:1fr}h1{font-size:30px}}
</style></head><body><header><h1>7-2 garbage cube studies</h1><p>F / CRUSHED MIX is selected for the live game. Its occasional screw and bolt details stay attached to each cube through launch and landing. Earlier studies follow; all keep the same 17 × 17 gameplay footprint.</p></header><main></main><script>${js}</script></body></html>`;
const dir='work/mockups/gravity-7-2-cube-bakeoff';
mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/cube-bakeoff.html`,html);
writeFileSync('dist/vacuum-cube-bakeoff.html',html);
console.log(`Built ${dir}/cube-bakeoff.html and dist/vacuum-cube-bakeoff.html`);
