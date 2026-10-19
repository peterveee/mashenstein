// Review-only intake designs. Every option keeps MAW's body, hose endpoints,
// outlet and gameplay timing; only the flexible tube and pickup head change.
import { VACUUM_INK as INK, vacuumBox as box, vacuumOval as oval,
  vacuumLine as line, drawVacuumMawBody } from '../sprites/vacuum-compactor.js';
export { drawVacuumRobotStudy, VACUUM_BAKEOFF_LOOP } from './vacuum-robot-candidates.js';

function path(c,p) {
  c.beginPath();c.moveTo(...p[0]);c.bezierCurveTo(...p[1],...p[2],...p[3]);
}
function stroke(c,p,color,width) {
  path(c,p);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function point(p,t) {
  const u=1-t;
  const x=u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0];
  const y=u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1];
  const dx=3*u*u*(p[1][0]-p[0][0])+6*u*t*(p[2][0]-p[1][0])+3*t*t*(p[3][0]-p[2][0]);
  const dy=3*u*u*(p[1][1]-p[0][1])+6*u*t*(p[2][1]-p[1][1])+3*t*t*(p[3][1]-p[2][1]);
  const length=Math.hypot(dx,dy)||1;
  return {x,y,nx:-dy/length,ny:dx/length};
}
function across(c,p,t,half,color,width=.65) {
  const q=point(p,t);
  line(c,q.x-q.nx*half,q.y-q.ny*half,q.x+q.nx*half,q.y+q.ny*half,color,width);
}
function shape(c,pts,fill,width=.7) {
  c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
  c.fillStyle=fill;c.fill();c.strokeStyle=INK;c.lineWidth=width;c.stroke();
}
function ferrule(c,p,color) {
  // End caps are integrated into the hose, not painted across the robot face.
  across(c,p,.045,2.6,color,1.4);across(c,p,.95,2.6,color,1.4);
}

function bellowsHose(c,p) {
  stroke(c,p,INK,7.2);stroke(c,p,'#596b69',5.8);stroke(c,p,'#88918a',4.5);
  for(let t=.09;t<.96;t+=.062) across(c,p,t,2.7,t% .124 < .062?'#344b50':'#b6ada0',1.1);
  ferrule(c,p,'#d5c5a1');
}
function bellowsHead(c) {
  oval(c,0,-3,3.2,2.7,'#617779');
  shape(c,[[-16,-2],[-11,-5],[11,-5],[16,-2],[17,3],[-17,3]],'#a7aaa0');
  box(c,-13,-3,26,4,'#e0d6b8',1.3);
  box(c,-15,3,30,2.5,'#344c50',.7);
  for(let x=-13;x<=13;x+=2)line(c,x,5.4,x+.3,7.5,'#c5c4ae',.55);
  line(c,-11,-3,11,-3,'#f5ebd0',.7);
}

function ribbonHose(c,p) {
  stroke(c,p,INK,6.5);stroke(c,p,'#365f64',5.2);stroke(c,p,'#83a69d',3.6);
  stroke(c,p,'#cce0c9',.8);
  ferrule(c,p,'#a8c2b6');
}
function ribbonHead(c) {
  oval(c,-2,-3,3.1,2.5,'#648c88');
  shape(c,[[-17,-1],[-13,-4],[13,-4],[17,-1],[14,4],[-14,4]],'#678f88');
  shape(c,[[-15,1],[-12,-1],[12,-1],[15,1],[12,3],[-12,3]],'#dae4d2',.5);
  for(const x of [-13,13])oval(c,x,3,1.4,1.4,'#e5c16e');
  for(let x=-11;x<=11;x+=2)line(c,x,4.2,x,6.8,'#244349',.55);
}

function glassHose(c,p,time,active) {
  stroke(c,p,INK,7);stroke(c,p,'#67847b',5.7);stroke(c,p,'#b8d0ba',4.6);
  stroke(c,p,'#405e61',2.9);
  // Individual scraps travel inside a visible intake, without neon flow dashes.
  if(active) for(let i=0;i<4;i++) {
    const q=point(p,(i/4+time*.34)%1);
    oval(c,q.x,q.y,i%2?1.05:.75,i%2?.65:.95,i%2?'#d0af76':'#c4c8ae');
  }
  ferrule(c,p,'#d3decd');
}
function glassHead(c,{time=0,active=false}={}) {
  oval(c,-2,-3,3.4,3,'#8eaaa0');
  box(c,-17,-3,34,8,'#91aaa0',3);
  box(c,-14,-2,28,5,'#c7d5c0',2);
  box(c,-12,1,24,3,'#3a5b5d',1);
  for(let x=-10;x<=10;x+=3) {
    const wobble=active ? Math.sin(time*13+x)*.6 : 0;
    line(c,x,4,x+wobble,7,'#d8cbaa',.8);
  }
  for(const x of [-14,14])oval(c,x,2,1.5,1.5,'#3c585c');
}

function spiralHose(c,p) {
  stroke(c,p,INK,7.8);stroke(c,p,'#4c4857',6.2);stroke(c,p,'#84768a',4.9);
  for(let t=.07;t<.95;t+=.052) {
    const q=point(p,t),r=point(p,Math.min(.99,t+.022));
    line(c,q.x-q.nx*2.5,q.y-q.ny*2.5,r.x+r.nx*2.5,r.y+r.ny*2.5,'#c0b59c',.82);
  }
  ferrule(c,p,'#d0d89b');
}
function spiralHead(c) {
  oval(c,-2,-3,3.5,2.7,'#756d7c');
  shape(c,[[-15,-2],[-12,-5],[12,-5],[15,-2],[16,2],[12,5],[-12,5],[-16,2]],'#b6c369');
  box(c,-12,-2,24,4,'#394a4c',1.2);
  for(let x=-10;x<=10;x+=3.5)oval(c,x,4.5,1.1,1.1,'#e6dfae');
  for(let x=-12;x<=12;x+=2.2)line(c,x,5.2,x,7.1,'#5a5b55',.6);
  line(c,-9,-3,9,-3,'#e5e8b0',.8);
}

export const VACUUM_HOSE_BAKEOFF = [
  {id:'A',name:'BELLOWS',subtitle:'Pleated industrial tube + wide broom lip',color:'#d5c5a1',
    draw:drawVacuumMawBody,drawHose:bellowsHose,drawBrush:bellowsHead,
    note:'A robust ribbed hose and broad bristle edge. Reads clearly as a vacuum at running speed.'},
  {id:'B',name:'RIBBON',subtitle:'Smooth swept conduit + low-profile nozzle',color:'#9bc7b6',
    draw:drawVacuumMawBody,drawHose:ribbonHose,drawBrush:ribbonHead,
    note:'A cleaner, sleeker appliance shape with a narrow contact mouth and little visual noise.'},
  {id:'C',name:'GLASSLINE',subtitle:'Smoked intake window + visible travelling scraps',color:'#c4d2bd',
    draw:drawVacuumMawBody,drawHose:glassHose,drawBrush:glassHead,
    note:'The hose briefly shows rubbish moving inside it; the head has a visible sweeping chamber.'},
  {id:'D',name:'SPIRAL',subtitle:'Wrapped service hose + double-roller pickup',color:'#d0d89b',
    draw:drawVacuumMawBody,drawHose:spiralHose,drawBrush:spiralHead,
    note:'A heavier coiled hose and compact mechanical head, coloured to tie into MAW’s lime jaw.'},
];
