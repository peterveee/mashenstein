import { VACUUM_ROBOT_CANDIDATES, VACUUM_BAKEOFF_LOOP, VACUUM_BAKEOFF_LAUNCHES, drawVacuumRobotStudy } from '../src/dev/vacuum-robot-candidates.js';
import { vacuumAttackPhase } from '../src/game/gravity/encounters.js';

const main=document.querySelector('main'), play=document.querySelector('#play'), scrub=document.querySelector('#time');
let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,t=1.35,last=null,focus=null;
const cards=VACUUM_ROBOT_CANDIDATES.map(candidate=>{
  const card=document.createElement('article');
  card.style.setProperty('--accent',candidate.color);
  const header=document.createElement('div');header.className='cardhead';
  const badge=document.createElement('b');badge.className='badge';badge.textContent=candidate.id;
  const words=document.createElement('div');
  const h=document.createElement('h2');h.textContent=candidate.name;
  const sub=document.createElement('span');sub.textContent=candidate.subtitle;words.append(h,sub);header.append(badge,words);
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',`${candidate.id} ${candidate.name} animated vacuum robot`);
  const note=document.createElement('p');note.textContent=candidate.note;
  const button=document.createElement('button');button.textContent=`Enlarge ${candidate.id}`;
  button.onclick=()=>{focus=focus===candidate.id?null:candidate.id;updateFocus();draw();};
  card.append(header,canvas,note,button);main.append(card);return {candidate,card,canvas,button};
});
function updateFocus(){
  main.classList.toggle('focused',focus!==null);
  for(const entry of cards){entry.card.hidden=focus!==null&&focus!==entry.candidate.id;entry.button.textContent=focus===entry.candidate.id?'Compare all three':`Enlarge ${entry.candidate.id}`;}
}
function label(){play.textContent=playing?'Pause':'Play';}
function freeze(time){t=time;playing=false;label();draw();}
play.onclick=()=>{playing=!playing;label();};
scrub.oninput=()=>freeze(Number(scrub.value));
document.querySelector('#step').onclick=()=>freeze((t+1/60)%VACUUM_BAKEOFF_LOOP);
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>freeze(Number(b.dataset.time)));
document.querySelector('#gravity').onchange=draw;
document.querySelector('#save').onclick=()=>{
  // Export the current comparison from the same smooth painters at 3840×1200.
  const canvas=document.createElement('canvas');canvas.width=3840;canvas.height=1200;
  const c=canvas.getContext('2d');c.scale(2,2);c.fillStyle='#14272b';c.fillRect(0,0,1920,600);
  c.fillStyle='#efe7cb';c.font='bold 28px system-ui';c.fillText('7-2 · THE VACUUM / COMPACTOR BAKEOFF',24,38);
  c.font='16px system-ui';c.fillStyle='#a9c5b8';c.fillText(document.querySelector('#direction').textContent,24,66);
  VACUUM_ROBOT_CANDIDATES.forEach((candidate,i)=>{
    c.save();c.translate(i*640,112);drawVacuumRobotStudy(c,t,candidate,{lane:Number(document.querySelector('#gravity').value)});c.restore();
    c.fillStyle=candidate.color;c.font='bold 23px system-ui';c.fillText(`${candidate.id} — ${candidate.name}`,24+i*640,100);
    c.font='16px system-ui';c.fillStyle='#bed0c3';c.fillText(candidate.subtitle,24+i*640,563);
  });
  const exportBox=document.querySelector('#export');exportBox.replaceChildren();
  const link=document.createElement('a');link.download=`vacuum-robots-${document.querySelector('#gravity').value==='1'?'gravity-up':'gravity-down'}-${t.toFixed(2)}.png`;
  link.href=canvas.toDataURL('image/png');link.textContent='Download this 3840 × 1200 PNG';
  const preview=document.createElement('img');preview.alt='Exported vacuum robot comparison';preview.src=link.href;
  preview.style.cssText='display:block;width:100%;height:auto;margin-top:12px';
  exportBox.append(link,preview);exportBox.hidden=false;
};
function draw(){
  const lane=Number(document.querySelector('#gravity').value);
  const at=VACUUM_BAKEOFF_LAUNCHES.find(at=>at>t) ?? VACUUM_BAKEOFF_LAUNCHES.at(-1);
  const phase=vacuumAttackPhase({at},t).phase;
  const names={waiting:'Routine sweep',suction:'Brush & suck',loaded:'Compact',telegraph:'Eject',launched:'Cube on the running surface'};
  document.querySelector('#phase').textContent=names[phase];
  document.querySelector('#direction').textContent=lane?'Floor rubbish → compactor → ceiling cube':'Ceiling rubbish → compactor → floor cube';
  scrub.value=t;document.querySelector('#clock').textContent=`${t.toFixed(2)} s`;
  for(const {candidate,canvas,card} of cards){
    if(card.hidden)continue;
    const css=canvas.clientWidth||640,density=Math.max(2,devicePixelRatio||1);
    const rw=Math.round(css*density),rh=Math.round(rw*420/640);
    if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;}
    const c=canvas.getContext('2d');c.setTransform(rw/640,0,0,rh/420,0,0);
    drawVacuumRobotStudy(c,t,candidate,{lane});
  }
}
function tick(now){
  if(playing&&last!==null)t=(t+Math.min((now-last)/1000,.08)*Number(document.querySelector('#speed').value))%VACUUM_BAKEOFF_LOOP;
  last=now;if(playing)draw();requestAnimationFrame(tick);
}
window.addEventListener('resize',draw);
label();draw();requestAnimationFrame(tick);
