import { drawToon, TOON_SPECS } from '../src/sprites/toons.js';
const options = [
  ['0 — Current', 'Straight bodice patch · reference', null],
  ['A — Curved sling', 'Shoulder → same-side ribs · closest to your request', 'sling'],
  ['B — Compact loop', 'Plain strip · lighter leather, tight underarm turn', 'loop'],
  ['B2 — Angled L', 'Straight strip · angled underarm return', 'loop', true],
  ['C — Belt carrier', 'Two leather tabs secure the case to the rear belt', 'belt'],
];
let paused = false, time = 0, last = 0;
const tiles = [];
for (const [name, description, mount, angular = false] of options) {
 const card = document.createElement('article');
 card.innerHTML = `<h2>${name}</h2><p>${description}</p>`;
 const canvas = document.createElement('canvas'); canvas.width = 660; canvas.height = 700;
 canvas.style.width = '330px'; canvas.style.height = '350px';
 card.append(canvas); document.querySelector('main').append(card);
 tiles.push({canvas, spec: {...TOON_SPECS.fernwick, quiverMountStudy: mount, quiverAngular: angular}});
}
const jointControl = document.createElement('label');
jointControl.style.marginLeft = '18px';
jointControl.innerHTML = '<input type="checkbox" checked> B / B2 + C: smaller arm adjustment · run only';
document.querySelector('header').append(jointControl);
function render(now) {
 if (!paused) time += Math.min((now-last)/1000, .05); last = now;
 for (const {canvas, spec} of tiles) {
  const ctx = canvas.getContext('2d'); ctx.setTransform(2,0,0,2,0,0); ctx.clearRect(0,0,330,350);
  ctx.fillStyle='#afbac4';ctx.font='11px system-ui';ctx.textAlign='center';
  for (const [i,kind] of ['run','jump'].entries()) {
   const x=82+i*166; ctx.fillText(kind === 'run' ? 'RUN' : 'JUMP',x,20);
   const pose={kind,phase:(time*1.6)%1,time,vy:kind==='jump'?-160:0,grounded:kind!=='jump',squash:0,lean:0,roll:false,float:false,stomp:false,headless:false,facing:1};
   const adjustArm = kind === 'run' && jointControl.querySelector('input').checked
     && (spec.quiverMountStudy === 'loop' || spec.quiverMountStudy === 'belt');
   const poseSpec = adjustArm ? {...spec, armSeatIn: 0.0285, armSeatDown: 0.01} : spec;
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
