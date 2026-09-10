// Build the development-only portrait framing review. The page contains a
// shell with the reference and comparison controls plus the same page's
// embedded mode, which boots the real renderer and RunState in each iframe.
import esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const entry = 'tools/portrait-preview-entry.js';
const referencePath = 'work/mockups/portrait/portrait-options-a-b-c.png';
const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  logLevel: 'info',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const reference = readFileSync(referencePath).toString('base64');
mkdirSync('dist', { recursive: true });

writeFileSync('dist/portrait-preview.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Portrait framing · MASHENSTEIN</title>
<style>
:root{color-scheme:dark;--bg:#0d1119;--panel:#171e2a;--line:#334055;--muted:#aab7c9;--ink:#eef4ff;--accent:#77d8c2}
*{box-sizing:border-box}[hidden]{display:none!important}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{padding:24px}h1,h2,h3,p{margin:0}h1{font-size:27px;letter-spacing:.01em}h2{font-size:18px;margin-bottom:4px}h3{font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em;color:#dce7f7}
.lede{max-width:920px;margin-top:7px;color:var(--muted)}
.toolbar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:20px -24px 18px;padding:12px 24px;background:#111824ee;border-top:1px solid #263347;border-bottom:1px solid #263347;backdrop-filter:blur(8px)}
label{display:flex;align-items:center;gap:6px;color:#d6e0ef}select,input,button{font:inherit;color:var(--ink);background:#263247;border:1px solid #50627c;border-radius:5px;padding:6px 8px}button{cursor:pointer}button:hover{border-color:var(--accent)}input[type=range]{width:140px;padding:0;accent-color:var(--accent)}output{min-width:5ch;color:var(--accent);font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace}
.reference{display:grid;grid-template-columns:minmax(280px,640px) minmax(200px,1fr);gap:18px;align-items:start;padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:9px}.reference img{display:block;width:100%;height:auto;border:1px solid #506079;background:#0a0d13}.reference p{color:var(--muted);font-size:13px}
.options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.card{min-width:0;padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:9px;overflow:hidden}.card.current{border-color:#6684a8}.card.baseline{border-color:#6ac8ae}.card.target{border-color:#d7ad68}.sub{min-height:39px;color:var(--muted);font-size:12px}.frame-wrap{width:195px;height:422px;margin:12px auto 10px;overflow:hidden;background:#070a10;border:1px solid #475873;box-shadow:0 4px 18px #0008}.frame-wrap iframe{display:block;width:390px;height:844px;border:0;transform:scale(.5);transform-origin:top left;background:#070a10}.readout{min-height:58px;padding-top:8px;border-top:1px solid #334055;color:#c3d3e8;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.choice-note{color:#dbe5f4;font-size:12px;margin-top:4px}.footer{margin-top:16px;color:var(--muted);font-size:12px;max-width:1080px}
/* The embedded surface is deliberately a full CSS phone viewport. The game
   canvas is sized by the active frame; controls occupy the separate surface. */
#embed-surface{position:fixed;inset:0;overflow:hidden;background:#070a10}#embed-surface #game{position:absolute;left:0;top:0;display:block}#embed-surface #controls{position:absolute;left:0;top:0;display:block;touch-action:none}#error{position:fixed;left:12px;right:12px;bottom:12px;z-index:8;max-height:45vh;overflow:auto;padding:10px;background:#4e1e2b;color:#fff;border:1px solid #e9869a;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
@media(max-width:880px){body{padding:14px}.toolbar{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}.reference{grid-template-columns:1fr}.options{grid-template-columns:1fr;max-width:430px}.frame-wrap{margin-left:0}}
</style>
</head>
<body>
<main id="portrait-shell">
  <h1>Phone portrait framing · real game render</h1>
  <p class="lede">Development-only review surface. The reference is the supplied leftmost A option; each live card below boots the shipped RunState, level scenery, hazards and Lorenzo painter at a fixed seed and scene time. A changes only the uniform world zoom; Background zoom scales the single scenery pass for review, and the target is A × 1.0625.</p>
  <div class="toolbar">
    <label>Scene <select id="scene-select"><option value="flat">Flat obstacle</option><option value="gap">Gap / slide</option><option value="underground">Plumber 1 · The Works</option><option value="raised">Raised road</option><option value="rhythm">Level 3-1 · Rhythm Bankruptcy</option></select></label>
    <label>Viewport <select id="viewport-select"><option value="390x844">390 × 844</option><option value="375x667">375 × 667</option><option value="430x932">430 × 932</option></select></label>
    <label>Safe area <select id="safe-select"><option value="0,0,0,0">None</option><option value="59,0,34,0">Notch + home indicator</option><option value="0,47,21,47">Landscape edge preset</option></select></label>
    <label>A zoom <input id="a-zoom" type="range" min="1.600" max="3.000" step="0.001" value="2.200"><output id="a-zoom-value">2.200</output></label>
    <label>Background zoom <input id="background-zoom" type="range" min="1.00" max="1.30" step="0.01" value="1.00"><output id="background-zoom-value">100%</output></label>
    <span aria-label="animation controls"><button id="play-button" type="button">Play</button> <button id="pause-button" type="button">Pause</button> <button id="step-button" type="button">Step</button></span>
  </div>
  <section class="reference">
    <img data-reference alt="Supplied portrait options A, B and C reference sheet">
    <div><h2>Supplied reference</h2><p class="choice-note">The leftmost panel is A. It is retained as a visual calibration reference only; the three live cards use the actual game renderer and level painter.</p><p class="footer">Reference file: work/mockups/portrait/portrait-options-a-b-c.png</p></div>
  </section>
  <section class="options" aria-label="Portrait framing choices">
    <article class="card current" data-card="current"><h2>Current landscape</h2><p class="sub">Production 480 × 270 frame, shown letterboxed inside the same phone viewport.</p><div class="frame-wrap"><iframe data-choice="current" title="Current landscape real game render"></iframe></div><div class="readout" data-readout="current">Waiting for renderer…</div></article>
    <article class="card baseline" data-card="baseline"><h2>A calibration</h2><p class="sub">Full-height portrait frame using the live calibration zoom.</p><div class="frame-wrap"><iframe data-choice="baseline" title="A calibration real game render"></iframe></div><div class="readout" data-readout="baseline">Waiting for renderer…</div></article>
    <article class="card target" data-card="target"><h2>A × 1.0625</h2><p class="sub">Same seed, pose and scene time; world width contracts by 16/17.</p><div class="frame-wrap"><iframe data-choice="target" title="A target real game render"></iframe></div><div class="readout" data-readout="target">Waiting for renderer…</div></article>
  </section>
  <p class="footer">Readouts come from the rendered toon probe, camera transform and active RunState. Hazard timing is shown only where the seeded scene exposes an authored actionable obstacle; otherwise it reports unavailable. Controls are intentionally subtle in the review capture and retain broad lower-half jump/slide zones.</p>
</main>
<div id="embed-surface" hidden><canvas id="game" aria-label="Portrait game preview"></canvas><canvas id="controls" aria-label="Portrait controls"></canvas></div>
<pre id="error" hidden></pre>
<script>window.__PORTRAIT_REFERENCE__='data:image/png;base64,${reference}';</script>
<script>${js}</script>
</body>
</html>
`);
console.log('dist/portrait-preview.html written');
