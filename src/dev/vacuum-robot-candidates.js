// Review-only bodies. The brush, rubbish, crusher and cube use campaign art.
import { VACUUM_INK as INK, vacuumBox as box, vacuumOval as oval, vacuumLine as line,
  drawCompactorWindow, drawVacuumAssembly, drawVacuumDebris, drawGarbageCube, vacuumBrushPose } from '../sprites/vacuum-compactor.js';
import { vacuumAttackPhase, VACUUM_PREP_SECONDS, VACUUM_SHOT_SPEED } from '../game/gravity/encounters.js';
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { drawGravityHazard } from '../sprites/gravity-encounters.js';
import { drawToon } from '../sprites/toons.js';

export const VACUUM_ROBOT_CANDIDATES = [
  { id:'A', name:'DUSTY', subtitle:'The eager little canister',
    note:'Round mustard shell, big curious eyes and mitten hands. Puffs his cheeks to compact; gives you a sly wink before the drop.', color:'#e9b954', draw:drawDusty },
  { id:'B', name:'SQUISH', subtitle:'The smug little compactor',
    note:'Mint enamel box, warm cream face and a lopsided grin. His whole body compresses with the rubbish, then pops back into shape.', color:'#84bfa6', draw:drawSquish },
  { id:'C', name:'BRISTLE', subtitle:'The floating station janitor',
    note:'Coral boiler suit, separate swivelling head and a jaunty cap. Holds the hose like a cleaning wand and salutes after making a mess.', color:'#e48e72', draw:drawBristle },
];
export const VACUUM_BAKEOFF_LOOP = 8;

function arm(c, x1,y1,x2,y2,x3,y3,color) {
  const path=()=>{c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(x2,y2,x3,y3);};
  path();c.strokeStyle=INK;c.lineWidth=4.6;c.stroke();
  path();c.strokeStyle=color;c.lineWidth=3;c.stroke();
  oval(c,x3,y3,3.8,3.2,'#efdfbd');
  line(c,x3-1,y3+.6,x3+1.5,y3+.6,'#a7a48e',.55);
}
function face(c, p, { y=-10, eyeSpace=7, eyeSize=3.5, screen=false }={}) {
  const crush=p.phase==='loaded', wink=p.phase==='telegraph';
  const blink=Math.sin(p.time*1.4)>.992;
  for(const side of [-1,1]) {
    const x=side*eyeSpace, closed=crush||blink||(wink&&side===1);
    if(closed) {
      c.beginPath();c.moveTo(x-eyeSize,y);c.quadraticCurveTo(x,y-2,x+eyeSize,y+.5);
      c.strokeStyle=screen?'#e3f6da':INK;c.lineWidth=1.2;c.stroke();
    } else {
      oval(c,x,y,eyeSize,eyeSize*1.25,screen?'#d5f0ce':'#fff2ce');
      oval(c,x+(p.phase==='suction'?1.1:-.8),y+.4,1.5,2,INK);
      oval(c,x+(p.phase==='suction'?.7:-1.2),y-.4,.45,.6,'#fff8dc');
    }
    line(c,x-eyeSize,y-eyeSize-2.3,x+eyeSize,y-eyeSize-(side===-1?3.5:1.7),screen?'#b3e4d2':INK,1);
  }
  if(p.phase==='suction') oval(c,0,y+7,2,2.4,INK);
  else if(crush) {
    line(c,-3,y+7,3,y+7,INK,1);
    oval(c,-12,y+5,2.2,1.5,'#e7a17f');oval(c,12,y+5,2.2,1.5,'#e7a17f');
  } else {
    c.beginPath();c.moveTo(-5,y+5.5);c.quadraticCurveTo(0,y+10,6,y+4.5);
    c.strokeStyle=screen?'#d5f0ce':INK;c.lineWidth=1;c.stroke();
    line(c,5,y+3.8,7,y+5.5,screen?'#d5f0ce':INK,.7);
  }
}

function drawDusty(c,p) {
  const squeeze=p.phase==='loaded'?Math.sin(p.progress*Math.PI)*.04:0;
  arm(c,-23,1,-37,2,-31,-9,'#bc954b');
  arm(c,24,1,31,13,29,5,'#bc954b');
  c.save();c.scale(1+squeeze,1-squeeze);
  oval(c,0,-1,29,26,'#d9a23e');
  oval(c,-2,-3,25.5,23,'#edc55f');
  // Top carry handle and a slightly crooked service lamp.
  c.beginPath();c.moveTo(-9,-25);c.quadraticCurveTo(-10,-34,0,-34);c.quadraticCurveTo(10,-34,10,-25);
  c.strokeStyle=INK;c.lineWidth=3;c.stroke();c.strokeStyle='#a7b8a9';c.lineWidth=1.4;c.stroke();
  line(c,17,-24,21,-31,'#526f73',1.6);oval(c,21,-32,2.3,2.3,'#b6e4bc');
  box(c,-20,-21,40,21,'#f7df98',8);face(c,p,{y:-13});
  for(const side of [-1,1]) oval(c,side*23,0,1.3,1.3,'#fff0b5');
  drawCompactorWindow(c,p.phase,p.progress,p.time);
  for(let i=0;i<3;i++)line(c,-9+i*7,22,-5+i*7,22,'#775b31',1);
  c.restore();
}
function drawSquish(c,p) {
  const crush=p.phase==='loaded'?Math.sin(p.progress*Math.PI)*.1:0;
  arm(c,-24,-2,-35,-12,-30,-15,'#79a99a');
  arm(c,24,-1,34,12,29,5,'#79a99a');
  c.save();c.scale(1+crush*.65,1-crush);
  box(c,-27,-26,54,51,'#548a80',7);
  box(c,-25,-26,48,48,'#9ac8ac',7);
  box(c,-21,-22,40,22,'#f0e5c1',6);face(c,p,{y:-14,eyeSpace:8,eyeSize:3});
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
  const salute=p.phase==='launched'?Math.sin(Math.min(1,p.progress)*Math.PI/2):0;
  arm(c,-19,0,-34,-7,-28,-13-salute*8,'#ba705c');
  arm(c,19,0,30,13,29,5,'#ba705c');
  box(c,-22,-8,44,32,'#c9775f',8);
  box(c,-18,-6,36,28,'#eda582',6);
  box(c,-6,-18,12,10,'#728a84',2);
  for(let i=0;i<3;i++)line(c,-5,-16+i*2,5,-16+i*2,'#c5d2bb',.6);
  c.save();c.translate(0,-25);c.rotate(p.phase==='suction'?.1:-.06);
  box(c,-19,-14,38,28,'#e7d5ad',9);
  oval(c,-20,-1,3,5,'#9cbbb0');oval(c,20,-1,3,5,'#9cbbb0');
  face(c,p,{y:-4,eyeSpace:7,eyeSize:3.2});
  box(c,-19,-17,38,6,'#bd715b',3);
  box(c,-8,-23,23,8,'#e29b77',3);box(c,-22,-15,32,3,'#7a5951',1);
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
  const at=5.5, attack={ at,lane,sourceLane:1-lane,...vacuumAttackPhase({at},t),
    sourceVisible:t>at-VACUUM_PREP_SECONDS-1,sourceX:x+37+(3.4-t)*20 };
  const brush=vacuumBrushPose({x,y,corridor,attack});
  drawVacuumDebris(c,{x:attack.sourceX,railY:attack.sourceLane?-corridor:0,lane:attack.sourceLane,
    progress:attack.phase==='waiting'?0:attack.phase==='suction'?attack.progress:1,brushX:brush.x});
  // One short warning wire; debris and the cleaner now own the opposite rail.
  c.save();c.translate(0,lane?0:-corridor);if(!lane)c.scale(1,-1);
  drawGravityHazard(c,{type:'railPulse',w:32,h:7,def:{}},10-t*20,0,t);c.restore();
  drawVacuumAssembly(c,{x,y,corridor,attack,time:t,drawBody:candidate.draw});
  if(t>=at){
    const age=t-at,xx=x-17-age*VACUUM_SHOT_SPEED;
    c.save();if(lane){c.translate(0,-corridor);c.scale(1,-1);}
    drawGarbageCube(c,xx,-5);
    if(age<.3){c.globalAlpha=1-age/.3;for(let i=-1;i<=1;i++)oval(c,xx+i*(6+age*20),-2-age*5,1.2,.6,'#b7b899');}
    c.restore();
  }
  const heroX=view*.19, hitAt=at+(x-17-heroX)/VACUUM_SHOT_SPEED;
  const jump=Math.max(0,Math.sin(Math.max(0,Math.min(1,(t-hitAt+.5)/1.2))*Math.PI))*31;
  c.save();c.translate(heroX,lane?-corridor:0);if(lane)c.scale(1,-1);
  drawToon(c,'lorenzo',{kind:'run',phase:t*1.6%1,time:t,grounded:jump===0,facing:1},0,-jump,24);c.restore();
  c.restore();
}
