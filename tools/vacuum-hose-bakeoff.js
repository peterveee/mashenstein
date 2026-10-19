import { VACUUM_HOSE_BAKEOFF, drawVacuumRobotStudy, VACUUM_BAKEOFF_LOOP } from '../src/dev/vacuum-hose-bakeoff.js';

const main=document.querySelector('main'),play=document.querySelector('#play'),scrub=document.querySelector('#time');
let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,t=1.35,last=null,focus=null;
const cards=VACUUM_HOSE_BAKEOFF.map(candidate=>{
  const card=document.createElement('article');card.style.setProperty('--accent',candidate.color);
  card.innerHTML=`<header><b>${candidate.id}</b><div><h2>${candidate.name}</h2><span>${candidate.subtitle}</span></div></header><canvas aria-label="${candidate.name} hose and vacuum head animation"></canvas><p>${candidate.note}</p><button>Enlarge ${candidate.id}</button>`;
  const canvas=card.querySelector('canvas'),button=card.querySelector('button');
  button.onclick=()=>{focus=focus===candidate.id?null:candidate.id;updateFocus();draw();};
  main.append(card);return{candidate,card,canvas,button};
});
function updateFocus(){
  main.classList.toggle('focused',focus!==null);
  for(const e of cards){e.card.hidden=!!focus&&focus!==e.candidate.id;e.button.textContent=focus===e.candidate.id?'Back to all four':`Enlarge ${e.candidate.id}`;}
}
function label(){play.textContent=playing?'Pause':'Play';}
function freeze(time){t=time;playing=false;label();draw();}
play.onclick=()=>{playing=!playing;label();};
scrub.oninput=()=>freeze(Number(scrub.value));
document.querySelector('#step').onclick=()=>freeze((t+1/60)%VACUUM_BAKEOFF_LOOP);
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>freeze(Number(b.dataset.time)));
document.querySelector('#gravity').onchange=draw;
function draw(){
  const lane=Number(document.querySelector('#gravity').value);
  scrub.value=t;document.querySelector('#clock').textContent=`${t.toFixed(2)} s`;
  for(const {candidate,canvas,card} of cards){
    if(card.hidden)continue;
    const css=canvas.clientWidth||800,density=Math.max(2,devicePixelRatio||1);
    const rw=Math.round(css*density),rh=Math.round(rw*420/640);
    if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;}
    const c=canvas.getContext('2d');c.setTransform(rw/640,0,0,rh/420,0,0);
    drawVacuumRobotStudy(c,t,candidate,{lane});
  }
}
document.querySelector('#save').onclick=()=>{
  const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=2480;
  const c=canvas.getContext('2d');c.scale(2,2);c.fillStyle='#12262c';c.fillRect(0,0,1600,1240);
  c.fillStyle='#f3edda';c.font='bold 30px system-ui';c.fillText('7-2 / VACUUM HOSE + HEAD',30,47);
  c.font='16px system-ui';c.fillStyle='#b4cac1';c.fillText('Current MAW body · same hose endpoints and cube outlet',30,78);
  VACUUM_HOSE_BAKEOFF.forEach((candidate,i)=>{
    const x=(i%2)*800,y=110+Math.floor(i/2)*560;
    c.fillStyle=candidate.color;c.font='bold 24px system-ui';c.fillText(`${candidate.id} / ${candidate.name}`,x+24,y+30);
    c.save();c.translate(x,y+46);c.scale(1.25,1.25);drawVacuumRobotStudy(c,t,candidate,{lane:Number(document.querySelector('#gravity').value)});c.restore();
  });
  const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='vacuum-hose-head-comparison.png';a.click();
};
function tick(now){if(playing&&last!==null)t=(t+Math.min((now-last)/1000,.08)*Number(document.querySelector('#speed').value))%VACUUM_BAKEOFF_LOOP;last=now;if(playing)draw();requestAnimationFrame(tick);}
window.addEventListener('resize',draw);updateFocus();label();draw();requestAnimationFrame(tick);
