import { drawToon, TOON_SPECS } from '../src/sprites/toons.js';
const options = [
  ['B — Original study width', 'Reference width · 85% opacity', 0.030, 0.85],
  ['W1 — 10% thinner', '90% of current width · 85% opacity', 0.027, 0.85],
  ['W2 — SHIPPED · 20% thinner', '80% of current width · 85% opacity', 0.024, 0.85],
  ['W3 — 30% thinner', '70% of current width · 85% opacity', 0.021, 0.85],
  ['W4 — 40% thinner', '60% of current width · 85% opacity', 0.018, 0.85],
  ['W5 — 50% thinner', 'Half of current width · 85% opacity', 0.015, 0.85],
];
let paused = false, time = 0, last = 0;
const tiles = [];
for (const [name, description, width, opacity] of options) {
 const card = document.createElement('article');
 card.innerHTML = `<h2>${name}</h2><p>${description}</p>`;
 const canvas = document.createElement('canvas'); canvas.width = 660; canvas.height = 700;
 canvas.style.width = '330px'; canvas.style.height = '350px';
 card.append(canvas); document.querySelector('main').append(card);
 tiles.push({canvas, spec: {...TOON_SPECS.fernwick, quiverMount: 'loop', quiverAngular: false, quiverStrapWidth: width, quiverStrapOpacity: opacity}});
}
function render(now) {
 if (!paused) time += Math.min((now-last)/1000, .05); last = now;
 for (const {canvas, spec} of tiles) {
  const ctx = canvas.getContext('2d'); ctx.setTransform(2,0,0,2,0,0); ctx.clearRect(0,0,330,350);
  ctx.fillStyle='#afbac4';ctx.font='11px system-ui';ctx.textAlign='center';
  for (const [i,kind] of ['run','jump'].entries()) {
   const x=82+i*166; ctx.fillText(kind === 'run' ? 'RUN' : 'JUMP',x,20);
   const pose={kind,phase:(time*1.6)%1,time,vy:kind==='jump'?-160:0,grounded:kind!=='jump',squash:0,lean:0,roll:false,float:false,stomp:false,headless:false,facing:1};
   const poseSpec = kind === 'run' ? {...spec, armSeatIn: 0.0285, armSeatDown: 0.01} : spec;
   drawToon(ctx,'fernwick',pose,x,232,172,{spec: poseSpec});
   ctx.fillStyle='#afbac4';ctx.fillText('24u × 1.6 camera',x,266);
   ctx.save();ctx.translate(x,325);ctx.scale(1.6,1.6);drawToon(ctx,'fernwick',pose,0,0,24,{spec: poseSpec});ctx.restore();
  }
 }
 requestAnimationFrame(render);
}
document.querySelector('button').onclick=()=>{paused=!paused;document.querySelector('button').textContent=paused?'Play':'Pause';};
window.fernwickBakeoff = {freeze(t=.18){time=t;paused=true;}};
requestAnimationFrame(render);
