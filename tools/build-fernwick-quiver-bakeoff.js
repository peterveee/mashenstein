import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
const result = await esbuild.build({entryPoints:['tools/fernwick-quiver-bakeoff.js'],bundle:true,format:'iife',write:false});
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
mkdirSync('dist',{recursive:true});
writeFileSync('dist/fernwick-quiver-bakeoff.html',`<!doctype html><html><head><meta charset="utf-8"><title>Fernwick · quiver attachment bake-off</title><style>
body{margin:0;padding:28px;background:#141d25;color:#eef0df;font:15px system-ui}h1{font-size:26px;margin:0 0 8px}header p{color:#b7c3c9;max-width:950px;line-height:1.5}main{display:grid;grid-template-columns:repeat(4, minmax(330px,1fr));gap:12px}article{background:#202c36;border:1px solid #41505a;border-radius:12px;padding:12px 0;overflow:hidden}h2{font-size:18px;margin:6px 16px}article p{font-size:12px;color:#bec9cb;margin:8px 16px;min-height:32px}canvas{display:block;margin:auto}button{background:#d1df94;color:#172318;border:0;border-radius:6px;padding:8px 20px;margin:0 0 18px;cursor:pointer}@media(max-width:1400px){main{grid-template-columns:repeat(2, minmax(330px,1fr))}}</style></head><body><header><h1>Fernwick · quiver attachment bake-off</h1><p>Current character, shared animation clock. Inspect the shoulder in motion, then the small 24u views. A/B return beneath the arm; C moves the support to the belt. Candidate studies only.</p><button>Pause</button></header><main></main><script>${js}</script></body></html>`);
console.log('dist/fernwick-quiver-bakeoff.html written');
