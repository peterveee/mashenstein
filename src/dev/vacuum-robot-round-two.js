// Review-only designs. All use the live robot's hose, sockets and cube outlet.
import { VACUUM_INK as INK, vacuumBox as box, vacuumOval as oval,
  vacuumLine as line, drawCompactorWindow, drawVacuumControlBody, unit } from '../sprites/vacuum-compactor.js';
export { drawVacuumRobotStudy, VACUUM_BAKEOFF_LOOP } from './vacuum-robot-candidates.js';

function shape(c, points, fill, width=.8) {
  c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
  c.fillStyle=fill;c.fill();c.strokeStyle=INK;c.lineWidth=width;c.stroke();
}
function bite(p) {
  if(p.phase==='loaded')return unit(p.progress);
  if(p.phase==='telegraph')return 1-unit(p.progress/.2);
  return 0;
}
function mouth(c,p,{x=0,y=9,w=.78,h=.82,lights=20}={}) {
  c.save();c.translate(x,y);c.scale(w,h*(1-.44*bite(p)));c.translate(0,-10.5);
  drawCompactorWindow(c,p.phase,p.progress,p.time,true,lights,6.5);c.restore();
}
function dash(c,x,y,angle,color,length=6,width=1.7){
  c.save();c.translate(x,y);c.rotate(angle);line(c,-length/2,0,length/2,0,color,width);c.restore();
}
function bolts(c,points,color){for(const [x,y] of points){oval(c,x,y,.9,.9,color);line(c,x-.45,y,x+.45,y,INK,.35);}}

function drawForeman(c,p) {
  // Broad chamfered shoulders; a narrow waist keeps both existing mounts clear.
  shape(c,[[-18,-21],[18,-21],[25,-14],[25,11],[18,21],[-18,21],[-25,11],[-25,-14]],'#b98628');
  shape(c,[[-17,-18],[17,-18],[21,-13],[21,10],[16,18],[-16,18],[-21,10],[-21,-13]],'#e6b744');
  box(c,-20,-15,40,12,'#283e40',2.5);
  const effort=bite(p),aim=p.phase==='suction'?1:0;
  dash(c,-9,-9, .14+aim*.12+effort*.22,'#ffdf89',7-effort*2);
  dash(c,9,-9,-.14-aim*.12-effort*.22,'#ffdf89',7-effort*2);
  // A metal brow and restrained hazard markings read at game scale.
  line(c,-17,-15,17,-15,'#f6d778',1.4);
  for(const side of [-1,1])for(let i=0;i<3;i++)line(c,side*23,-4+i*3,side*23,-2.7+i*3,'#33484a',1.1);
  mouth(c,p,{w:.82,h:.82,lights:19.5});
  bolts(c,[[-18,14],[-18,-17],[18,-17]],'#e8dca8');
  for(let i=0;i<3;i++)shape(c,[[-10+i*7,18],[-7+i*7,18],[-5+i*7,20],[-8+i*7,20]],'#293d40',.35);
}
function drawRedline(c,p) {
  // A pressed-enamel appliance: swept shoulders and an integrated lower jaw.
  c.beginPath();c.moveTo(-7,-21);c.lineTo(7,-21);c.bezierCurveTo(23,-21,27,-13,26,1);
  c.lineTo(23,12);c.quadraticCurveTo(19,21,10,21);c.lineTo(-10,21);
  c.quadraticCurveTo(-19,21,-23,12);c.lineTo(-26,1);c.bezierCurveTo(-27,-13,-23,-21,-7,-21);c.closePath();
  c.fillStyle='#b94e46';c.fill();c.strokeStyle=INK;c.lineWidth=.8;c.stroke();
  box(c,-22,-17,44,16,'#e5dfc2',7);
  box(c,-18,-14,36,10,'#263e42',5);
  const b=bite(p),eject=p.phase==='telegraph';
  // Unequal shutters suggest a machine that knows exactly where the hero is.
  dash(c,-8.5,-9,eject?-.2:.06,'#f7d88a',7-b*2,1.8);
  dash(c,8.5,-9,eject?.2:-.14,'#f7d88a',eject?7:4.5-b,1.8);
  shape(c,[[-18,3],[-14,0],[14,0],[18,3],[18,15],[12,19],[-12,19],[-18,15]],'#eadfc3');
  mouth(c,p,{x:-1.5,y:9,w:.78,h:.81,lights:20.5});
  for(const side of [-1,1]){line(c,side*22,1,side*21,8,'#7b383a',1.2);oval(c,side*21,12,1,1,'#cfb88c');}
  line(c,-12,-19,12,-19,'#e68b70',.7);
}
function drawNull(c,p) {
  // Tall, tapered laboratory casing; the same top and bottom attachment points.
  shape(c,[[-13,-21],[13,-21],[22,-14],[23,9],[14,21],[-14,21],[-23,9],[-22,-14]],'#789f9b');
  shape(c,[[-12,-19],[12,-19],[19,-12],[19,8],[12,19],[-12,19],[-19,8],[-19,-12]],'#e2e8d8');
  box(c,-18,-15,36,14,'#163b45',4);
  const b=bite(p),pupilX=p.phase==='suction'?-1.2:p.phase==='telegraph'?1.1:0;
  for(const side of [-1,1]){
    const x=side*8;
    oval(c,x,-8,4,4,'#82b9b1');oval(c,x+pupilX,-8,1.8,2.3,'#15313b');
    c.save();c.beginPath();c.roundRect(-18,-15,36,14,4);c.clip();
    box(c,x-4.6,-15,9.2,4.7+b*3.2,'#365d60',.7);c.restore();
  }
  // A clean recessed jaw with three tiny warning lights in a vertical gutter.
  mouth(c,p,{x:-1,y:9,w:.74,h:.84,lights:20});
  for(const side of [-1,1])for(let i=0;i<3;i++)line(c,side*20,1+i*3,side*20,2+i*3,'#31565b',.8);
  shape(c,[[-4,18],[4,18],[2,20],[-2,20]],'#91b7ad',.5);
}
function drawMaw(c,p) {
  // Dark upper shell and a broad lime compaction jaw, visibly built to chew.
  box(c,-24,-21,48,42,'#54435e',8);
  box(c,-21,-18,42,18,'#75617e',5);
  box(c,-18,-15,36,11,'#202e39',3);
  const b=bite(p),aim=p.phase==='suction'?.2:0;
  dash(c,-8,-9,.2+aim+b*.2,'#d7ec91',7-b*2,1.8);
  dash(c,8,-9,-.2-aim-b*.2,'#d7ec91',7-b*2,1.8);
  shape(c,[[-24,2],[-19,-1],[19,-1],[24,2],[24,12],[16,21],[-16,21],[-24,12]],'#b5c65e');
  shape(c,[[-20,4],[-16,1],[16,1],[20,4],[20,12],[14,18],[-14,18],[-20,12]],'#d3d991',.6);
  mouth(c,p,{x:-1,y:9,w:.91,h:.86,lights:19});
  for(const side of [-1,1]){oval(c,side*22,3,1.2,1.2,'#7b8950');line(c,side*23,9,side*20,13,'#758242',.9);}
  line(c,-12,-19,12,-19,'#a58bae',.65);
}

export const VACUUM_ROUND_TWO = [
  {id:'A',name:'FOREMAN',subtitle:'Industrial yellow / hard-edged shoulders',color:'#e6b744',draw:drawForeman,
    note:'A blunt factory supervisor. A heavy brow tightens as the teeth compact; hazard marks make the drop feel deliberate.'},
  {id:'B',name:'REDLINE',subtitle:'Oxide red / vintage enamel appliance',color:'#e58d78',draw:drawRedline,
    note:'Rounded red casing, cream jaw and unequal eye shutters. A slightly smug appliance with a very inconvenient cleaning routine.'},
  {id:'C',name:'NULL',subtitle:'Porcelain and teal / clinical automation',color:'#bad6c9',draw:drawNull,
    note:'Cold optical lenses and a tapered laboratory shell. Its shutters lower under pressure, then reopen as it releases the cube.'},
  {id:'D',name:'MAW',subtitle:'Plum and acid lime / heavy compaction jaw',color:'#d3d991',draw:drawMaw,
    note:'A dark upper shell above a broad lime jaw. The largest mouth and sharpest eyes give the chewing a more threatening character.'},
];
export const VACUUM_CURRENT={id:'NOW',name:'CURRENT ROBOT',subtitle:'Your existing yellow vacuum',color:'#f3c750',draw:drawVacuumControlBody,
  note:'The current production body, using exactly the same hose, outlet and animation cycle as the four studies.'};
