import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['tools/shoulder-preview.js'], bundle: true, format: 'iife', write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/shoulder-preview.html', `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smooth shoulders · Gary & Dolores</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#12151c;color:#eee9df;font:15px system-ui}
h1{font-size:26px;margin:0 0 8px}p{color:#bfc5d0;line-height:1.5;max-width:850px}
.controls{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin:20px 0;position:sticky;top:0;background:#12151cee;padding:12px 0;z-index:1}
button,select{font:inherit;background:#2a3342;color:#fff;border:1px solid #637187;border-radius:6px;padding:8px;cursor:pointer}
label{display:flex;align-items:center;gap:8px}input{width:180px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1280px}
article{border:1px solid #394455;border-radius:10px;background:#1b202a;overflow:hidden}h2{font-size:20px;margin:16px 20px 0}
canvas{display:block;width:100%;height:480px}footer{color:#aeb9c9;margin-top:16px;font-size:13px}
@media(max-width:750px){main{grid-template-columns:1fr}body{padding:12px}}
</style>
<h1>Smooth shoulders · near arm only</h1><p>Gary and Dolores · current drawing beside the proposed near-arm join in motion and action poses. The far arm, resting stance and celebrations keep their current joins. The small figures use the game's 24u height at 2× camera zoom. Preview only; the live cast is unchanged.</p>
<div class="controls"><button id="play">Pause</button>
<label>Pose <select id="pose"><option value="run">Running</option><option value="walk">Walking</option><option value="jump">Jumping</option><option value="shoot">Shooting study</option><option value="stand">Standing · unchanged</option><option value="celebrate">Celebrating · unchanged</option><option value="raised">Raised arms · unchanged</option></select></label>
<label>Facing <select id="facing"><option value="1">Right</option><option value="-1">Left</option></select></label>
<label>Speed <select id="speed"><option value="0.4">Slow</option><option value="1" selected>Normal</option></select></label>
<label>Cycle <input id="phase" type="range" min="0" max="1" step="0.001" value="0.18"></label>
</div><main></main><footer>Each pair shares the same pose and clock. Shooting study borrows the shared pistol pose for both versions; it is not a new ability. Raised arms uses the existing legacy celebration.</footer>
<script>${js}</script></html>`);
console.log('dist/shoulder-preview.html written');
