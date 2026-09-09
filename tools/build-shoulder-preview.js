import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['tools/shoulder-preview.js'], bundle: true, format: 'iife', write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/shoulder-preview.html', `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smooth shoulders · Full cast</title>
<style>
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;padding:24px;background:#12151c;color:#eee9df;font:15px system-ui}
h1{font-size:26px;margin:0 0 8px}p{color:#bfc5d0;line-height:1.5;max-width:1050px}
.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0;position:sticky;top:0;background:#12151cf5;padding:12px 0;z-index:1}
button,select{font:inherit;background:#2a3342;color:#fff;border:1px solid #637187;border-radius:6px;padding:8px;cursor:pointer}
output{font:13px ui-monospace,monospace;min-width:7ch;text-align:center;padding:0 4px}
label{display:flex;align-items:center;gap:6px}input{width:150px}main{max-width:1500px}
article{border:1px solid #394455;border-radius:10px;background:#1b202a;overflow:hidden;margin-bottom:20px}
h2{font-size:20px;margin:16px 20px 0}article p{margin:8px 20px;font-size:13px}h3{text-align:center;font-size:13px;color:#d4d8df;margin:16px 0 0}
.poses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.poses section+section{border-left:1px solid #394455}
.single-pose .poses{grid-template-columns:1fr;max-width:700px;margin:auto}.single-pose .poses section{border:0}
canvas{display:block;width:100%;height:350px}footer{color:#aeb9c9;margin-top:16px;font-size:13px}
.single-pose canvas{height:480px}
@media(max-width:850px){.poses{grid-template-columns:1fr}.poses section+section{border-left:0;border-top:1px solid #394455}body{padding:12px}}
</style>
<h1>Smooth shoulders · full cast</h1><p>Shipped 9 Sep 2026. Run, jump and each character’s own attack. Each pair compares the old cap treatment with the shipped join. The near-arm correction eases away as the arm folds inward. Special arms and clothing joins remain unchanged references.</p>
<div class="controls"><button id="play">Pause</button>
<label>Character <select id="character"><option value="all">Everyone</option></select></label>
<label>View <select id="pose"><option value="all">Run + jump + attack</option><option value="run">Run / walk</option><option value="jump">Jump</option><option value="shoot">Attack</option></select></label>
<label>Gait <select id="gait"><option value="run">Run</option><option value="walk">Walk</option></select></label>
<label>Attack <select id="attack"><option value="ground">Grounded</option><option value="air">Airborne</option></select></label>
<label>Facing <select id="facing"><option value="1">Right</option><option value="-1">Left</option></select></label>
<label>Speed <select id="speed"><option value="0.4">Slow</option><option value="1" selected>Normal</option></select></label>
<label>Cycle <input id="phase" type="range" min="0" max="1" step="0.001" value="0.1125"></label>
<label>Frame <button id="prev" title="previous frame">&#9664;</button><output id="frame">#3</output><button id="next" title="next frame">&#9654;</button></label>
</div><main></main><footer>All pairs share the same clock. The attack cycle includes the move and recovery. Small figures use 24u at 2× camera zoom. Projectile flight is omitted so the character’s pose stays easy to inspect. Select one character or view for a closer look.</footer>
<script>${js}</script></html>`);
console.log('dist/shoulder-preview.html written');
