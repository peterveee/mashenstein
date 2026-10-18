// Review-only bodies. The brush, rubbish, crusher and cube use campaign art.
import { VACUUM_INK as INK, vacuumBox as box, vacuumOval as oval, vacuumLine as line,
  drawCompactorWindow, drawVacuumAssembly, drawVacuumDebris, drawGarbageCube, vacuumBrushPose } from '../sprites/vacuum-compactor.js';
import { vacuumAttackPhase, VACUUM_PREP_SECONDS, VACUUM_SHOT_SPEED } from '../game/gravity/encounters.js';
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { drawGravityHazard } from '../sprites/gravity-encounters.js';
import { drawToon } from '../sprites/toons.js';

export const VACUUM_ROBOT_CANDIDATES = [
  { id:'A', name:'DUSTY', subtitle:'The canister unit',
    note:'Round mustard housing, fixed optical sensors and steel grippers. Twin ducted propellers carry a conventional vacuum wand.', color:'#e9b954', draw:drawDusty },
  { id:'B', name:'SQUISH', subtitle:'The compactor unit',
    note:'Mint enamel box with an impassive sensor panel. The visible crusher closes on the rubbish; its casing compresses mechanically.', color:'#84bfa6', draw:drawSquish },
  { id:'C', name:'BRISTLE', subtitle:'The maintenance unit',
    note:'Coral service chassis with a smaller, level sensor head. A rigid vacuum wand and corrugated hose feed the transparent hopper.', color:'#e48e72', draw:drawBristle },
];
export const VACUUM_BAKEOFF_LOOP = 11.5;
export const VACUUM_BAKEOFF_LAUNCHES = [3.2,6.4];

function arm(c, x1,y1,x2,y2,x3,y3,color) {
  const path=()=>{c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(x2,y2,x3,y3);};
  path();c.strokeStyle=INK;c.lineWidth=4.6;c.stroke();
  path();c.strokeStyle=color;c.lineWidth=3;c.stroke();
  box(c,x3-3,y3-2.8,5,5.6,'#9cafa7',1);
  line(c,x3+1,y3-2.5,x3+4,y3-2.5,INK,1.2);
  line(c,x3+1,y3+2.5,x3+4,y3+2.5,INK,1.2);
}
function face(c, p, { y=-10, eyeSpace=7, eyeSize=3.5 }={}) {
  // Fixed, level optical sensors. Personality comes from the silhouette, not
  // smiles, eyebrows, cheek puffs, blinking or a wink before every shot.
  for(const side of [-1,1]) {
    const x=side*eyeSpace;
    box(c,x-eyeSize-1,y-eyeSize,eyeSize*2+2,eyeSize*2,'#314b50',1.5);
    oval(c,x,y,eyeSize*.66,eyeSize*.66,'#8ca8a0');
    oval(c,x,y,eyeSize*.33,eyeSize*.33,'#152b31');
    line(c,x-eyeSize*.4,y-eyeSize*.5,x+eyeSize*.2,y-eyeSize*.5,'#d6e2ca',.45);
  }
  for(let i=0;i<3;i++)line(c,-4+i*3,y+6,-4+i*3,y+8,'#496365',.7);
}

function drawDusty(c,p) {
  const squeeze=p.phase==='loaded'?Math.sin(p.progress*Math.PI)*.04:0;
  arm(c,-23,1,-32,11,-26,16,'#a38d55');
  arm(c,24,1,31,13,29,5,'#bc954b');
  c.save();c.scale(1+squeeze,1-squeeze);
  oval(c,0,-1,29,26,'#d9a23e');
  oval(c,-2,-3,25.5,23,'#edc55f');
  // Top carry handle and a slightly crooked service lamp.
  c.beginPath();c.moveTo(-9,-25);c.quadraticCurveTo(-10,-34,0,-34);c.quadraticCurveTo(10,-34,10,-25);
  c.strokeStyle=INK;c.lineWidth=3;c.stroke();c.strokeStyle='#a7b8a9';c.lineWidth=1.4;c.stroke();
  line(c,17,-24,21,-31,'#526f73',1.6);oval(c,21,-32,2.3,2.3,'#b6e4bc');
  box(c,-20,-21,40,21,'#c8c7a2',5);face(c,p,{y:-13});
  for(const side of [-1,1]) oval(c,side*23,0,1.3,1.3,'#fff0b5');
  drawCompactorWindow(c,p.phase,p.progress,p.time);
  for(let i=0;i<3;i++)line(c,-9+i*7,22,-5+i*7,22,'#775b31',1);
  c.restore();
}
function drawSquish(c,p) {
  const crush=p.phase==='loaded'?Math.sin(p.progress*Math.PI)*.1:0;
  arm(c,-24,-2,-33,10,-28,15,'#79a99a');
  arm(c,24,-1,34,12,29,5,'#79a99a');
  c.save();c.scale(1+crush*.65,1-crush);
  box(c,-27,-26,54,51,'#548a80',7);
  box(c,-25,-26,48,48,'#9ac8ac',7);
  box(c,-21,-22,40,22,'#c6cdb8',4);face(c,p,{y:-14,eyeSpace:8,eyeSize:3});
  // Rounded corners, metal side ribs and a spring-loaded lid.
  box(c,-28,-28,54,5,'#c9d9bd',2);
  box(c,-6,-32,12,4,'#617e79',1);
  for(let i=0;i<4;i++)line(c,24,-14+i*7,27,-14+i*7,'#345a58',.8);
  drawCompactorWindow(c,p.phase,p.progress,p.time);
  box(c,-18,21,36,3,'#ded5a7',.6);
  for(let i=0;i<4;i++)line(c,-14+i*9,21,-11+i*9,24,'#5a6b60',1.4);
  oval(c,-20,8,1.6,1.6,'#f2d684');
  c.restore();
}
function drawBristle(c,p) {
  arm(c,-19,0,-31,11,-26,17,'#a77868');
  arm(c,19,0,30,13,29,5,'#ba705c');
  box(c,-22,-8,44,32,'#c9775f',8);
  box(c,-18,-6,36,28,'#eda582',6);
  box(c,-6,-18,12,10,'#728a84',2);
  for(let i=0;i<3;i++)line(c,-5,-16+i*2,5,-16+i*2,'#c5d2bb',.6);
  // Scale the complete head (including cap and sensors) around its neck seat.
  // The bottom remains at -11, with the torso and compactor untouched.
  c.save();c.translate(0,-21.5);c.scale(.75,.75);
  box(c,-19,-14,38,28,'#c8c8ad',5);
  oval(c,-20,-1,3,5,'#9cbbb0');oval(c,20,-1,3,5,'#9cbbb0');
  face(c,p,{y:-4,eyeSpace:7,eyeSize:3.2});
  box(c,-19,-17,38,6,'#bd715b',3);
  box(c,-13,-23,26,8,'#c89076',3);box(c,-20,-15,40,3,'#7a5951',1);
  oval(c,4,-19,2,1.5,'#f3d77c');c.restore();
  drawCompactorWindow(c,p.phase,p.progress,p.time);
  for(const side of [-1,1])oval(c,side*18,-3,1.5,1.5,'#f4d483');
}

const LOOK=SPACE_LOOKS['plateau-occasional'];
export function drawVacuumRobotStudy(c,time,candidate,{lane=0,width=640,height=420}={}) {
  const t=((time%VACUUM_BAKEOFF_LOOP)+VACUUM_BAKEOFF_LOOP)%VACUUM_BAKEOFF_LOOP;
  c.save();c.beginPath();c.rect(0,0,width,height);c.clip();
  c.fillStyle=LOOK.bg;c.fillRect(0,0,width,height);
  const zoom=height/156, floor=height*.89;
  const view=width/zoom, corridor=120, cam=700+t*20;
  c.translate(0,floor);c.scale(zoom,zoom);
  const roomK=corridor/137;
  c.save();c.scale(roomK,roomK);
  drawSpaceRoom(c,LOOK,{cam:cam/roomK,view:view/roomK+60,top:-floor/zoom/roomK-15,
    bottom:(height-floor)/zoom/roomK+15,time:t,gates:[],length:12000,stage:2,lane,gateLane:lane,speed:20});
  c.restore();
  const x=view*.56,y=-corridor*.48;
  const attacks=VACUUM_BAKEOFF_LAUNCHES.map(at=>({at,count:at===6.4?2:1,lane,sourceLane:1-lane,...vacuumAttackPhase({at},t),
    sourceVisible:t>at-VACUUM_PREP_SECONDS-1,sourceX:x+37+(at-2.1-t)*20}));
  const attack=attacks.find(a=>a.phase!=='launched') || attacks.at(-1);
  // Small world-anchored piles continue along the source rail between attacks.
  for(const at of [.3,3.5,8.8,10.2]) {
    drawVacuumDebris(c,{x:x+35+(at-t)*20,railY:attack.sourceLane?-corridor:0,lane:attack.sourceLane,
      progress:Math.max(0,Math.min(1,(t-at+.18)/.36)),brushX:x+35});
  }
  for(const a of attacks) {
    const brush=vacuumBrushPose({x,y,corridor,attack:a});
    drawVacuumDebris(c,{x:a.sourceX,railY:a.sourceLane?-corridor:0,lane:a.sourceLane,
      progress:a.phase==='waiting'?0:a.phase==='suction'?a.progress:1,brushX:brush.x});
  }
  // Short live wires alternate with loose rubbish on the opposite rail.
  c.save();c.translate(0,lane?0:-corridor);if(!lane)c.scale(1,-1);
  for (const wireX of [10, x+35+6.5*20-18])
    drawGravityHazard(c,{type:'railPulse',w:36,h:7,def:{}},wireX-t*20,0,t);
  c.restore();
  const rigAttack=attack.phase==='waiting'||attack.phase==='launched'
    ? {...attack,phase:'sweep',progress:.5,sourceX:x+35} : attack;
  drawVacuumAssembly(c,{x,y,corridor,attack:rigAttack,time:t,drawBody:candidate.draw,rotorHeight:candidate.id==='C'?50:34});
  for(const at of VACUUM_BAKEOFF_LAUNCHES) if(t>=at){
    const age=t-at,xx=x-13.5-age*VACUUM_SHOT_SPEED;
    c.save();if(lane){c.translate(0,-corridor);c.scale(1,-1);}
    for(let i=0;i<(at===6.4?2:1);i++) drawGarbageCube(c,xx+i*24,-7.5);
    if(age<.3){c.globalAlpha=1-age/.3;for(let i=-1;i<=1;i++)oval(c,xx+i*(6+age*20),-2-age*5,1.2,.6,'#b7b899');}
    c.restore();
  }
  const heroX=view*.19;
  const jump=Math.max(...VACUUM_BAKEOFF_LAUNCHES.map(at=>{
    const hitAt=at+(x-13.5-heroX)/VACUUM_SHOT_SPEED;
    return Math.max(0,Math.sin(Math.max(0,Math.min(1,(t-hitAt+.5)/1.2))*Math.PI))*31;
  }));
  c.save();c.translate(heroX,lane?-corridor:0);if(lane)c.scale(1,-1);
  drawToon(c,'lorenzo',{kind:'run',phase:t*1.6%1,time:t,grounded:jump===0,facing:1},0,-jump,24);c.restore();
  c.restore();
}
