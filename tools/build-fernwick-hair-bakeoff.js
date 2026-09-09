import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['tools/fernwick-hair-bakeoff.js'], bundle: true, format: 'iife', write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/fernwick-hair.html', `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fernwick · gold in the hair</title>
<style>
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;padding:24px;background:#12151c;color:#eee9df;font:15px system-ui}
h1{font-size:26px;margin:0 0 8px}p{color:#bfc5d0;line-height:1.5;max-width:1050px}
.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0;position:sticky;top:0;background:#12151cf5;padding:12px 0;z-index:1}
button,select{font:inherit;background:#2a3342;color:#fff;border:1px solid #637187;border-radius:6px;padding:8px;cursor:pointer}
label{display:flex;align-items:center;gap:6px}input{width:180px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px;max-width:1600px}
article{border:1px solid #394455;border-radius:10px;background:#1b202a;overflow:hidden}
h2{font-size:17px;margin:14px 18px 0}article p{margin:6px 18px 0;font-size:12.5px;min-height:34px}
canvas{display:block;width:100%;height:300px}
main.wide{grid-template-columns:1fr;max-width:1200px}
footer{color:#aeb9c9;margin-top:18px;font-size:13px;max-width:1050px}
@media(max-width:520px){body{padding:12px}main{grid-template-columns:1fr}}
</style>
<h1>Fernwick — gold in the hair</h1>
<p>Ten ways to break her flat gold into strands and sections, against the shipped flat fill. Same head, same cut, same headband in every card: the only difference is what is painted inside the hair. Each card shows the crop the look is argued about at, the figure at gameplay size, and the 24u lane sprite at 2× — a strand that sings on the crop can smear on the sprite, and the sprite is what ships.</p>
<div class="controls"><button id="play">Pause</button>
<label>Pose <select id="pose"><option value="stand">Stand</option><option value="run">Run</option><option value="jump">Jump</option></select></label>
<label>Facing <select id="facing"><option value="1">Right</option><option value="-1">Left</option></select></label>
<label>Base colour <select id="palette"></select></label>
<label>View <select id="view"><option value="full">Head + figure</option><option value="heads">Heads only</option></select></label>
<label>Zoom <select id="zoom"><option value="1">1×</option><option value="1.7">1.7×</option><option value="2.6">2.6×</option></select></label>
<label>Cycle <input id="phase" type="range" min="0" max="1" step="0.001" value="0.1125"></label>
</div><main></main>
<footer>Highlight tones are mixed off the palette’s own hair colour at draw time, so the base-colour selector recolours the strands with it. Nothing here is cast: every option is <code>spec.hairStreaks</code> handed to the shipped painter through drawToon’s candidate seam.</footer>
<script>${js}</script></html>`);
console.log('dist/fernwick-hair.html written');
