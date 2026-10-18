// Shared by the campaign cleaner and its design bakeoff. Coordinates are smooth
// world units; the gallery paints the same paths into a desktop-density canvas.
export const VACUUM_INK = '#20353b';
export const unit = n => Math.max(0, Math.min(1, n));
const smooth = n => { const p = unit(n); return p * p * (3 - 2 * p); };
const mix = (a, b, p) => a + (b - a) * p;
export function vacuumLine(c, x, y, xx, yy, color, width = .8) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function vacuumBox(c, x, y, w, h, fill, r = 2) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  c.strokeStyle = VACUUM_INK; c.lineWidth = .8; c.stroke();
}
export function vacuumOval(c, x, y, rx, ry, fill) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  c.strokeStyle = VACUUM_INK; c.lineWidth = .8; c.stroke();
}
function polygon(c, pts, fill, width = .7) {
  c.beginPath(); pts.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = VACUUM_INK; c.lineWidth = width; c.stroke();
}

// Paper, crumpled foil, a bolt and lint: six separate pieces, not a source cube.
const PIECES = [
  { x:-20, y:-2, kind:0, angle:-.18 }, { x:-11, y:-3, kind:1, angle:.3 },
  { x:-3, y:-3, kind:2, angle:-.4 }, { x:6, y:-2, kind:0, angle:.5 },
  { x:14, y:-3, kind:3, angle:.2 }, { x:22, y:-2, kind:1, angle:-.25 },
];
function scrap(c, kind) {
  if (kind === 0) {
    polygon(c, [[-4,0],[-3,-5],[0,-4],[2,-6],[4,-1],[1,1]], '#e6d7b3', .55);
    vacuumLine(c,-2,-3,1,-1,'#a9a58d',.5); vacuumLine(c,1,-4,2,-2,'#a9a58d',.5);
  } else if (kind === 1) {
    c.fillStyle='#91aaa2';
    for(let i=0;i<4;i++){c.beginPath();c.ellipse(-3+i*2,-1-i%2,2.3,1.6,0,0,Math.PI*2);c.fill();}
    vacuumLine(c,-3,-2,2,-3,'#c1cabe',.5);
  } else if (kind === 2) {
    vacuumBox(c,-1.1,-4,2.2,7,'#abbec1',.3); vacuumBox(c,-3,-5,6,2.3,'#d7e1da',.4);
    for(let i=0;i<3;i++) vacuumLine(c,-1.6,-1+i*1.4,1.5,-2+i*1.4,'#536c71',.5);
  } else {
    polygon(c,[[-4,-2],[-2,-5],[2,-4],[4,0],[0,2],[-3,1]],'#acb9ba',.6);
    vacuumLine(c,-2,-3,1,-1,'#e4e8dc',.7); vacuumLine(c,1,-1,3,0,'#687e86',.6);
  }
}

// Progress is derived only from the encounter clock, so rewind restores every
// scrap without keeping an additional, independently mutable particle ledger.
export function drawVacuumDebris(c, { x, railY, lane, progress = 0, brushX = x }) {
  c.save(); c.translate(x, railY); c.scale(1, lane ? -1 : 1);
  for (let i=0;i<PIECES.length;i++) {
    const item=PIECES[i], p=unit((progress-.12-i*.045)/.26);
    if(p>=1) continue;
    const ease=smooth(p);
    c.save(); c.translate(mix(item.x,brushX-x,ease),mix(item.y,-8,ease)-Math.sin(p*Math.PI)*4);
    c.rotate(item.angle+p*1.6); c.scale(1-p*.55,1-p*.55); c.globalAlpha=1-p*.3;
    scrap(c,item.kind); c.restore();
  }
  c.restore();
}

// Flat side-on compressed rubbish; 21 × 15 on the running surface.
export function drawGarbageCube(c, x, y, scale = 1.5) {
  c.save(); c.translate(x,y); c.scale(scale,scale);
  polygon(c,[[-6.7,-4.3],[-4.7,-4.8],[-2,-4.5],[.4,-4.9],[3,-4.5],[6.5,-4.7],[6.8,-2],[6.4,.3],[6.8,3],[6.2,4.7],[3,4.5],[0,4.8],[-3,4.5],[-6.4,4.7],[-6.8,2],[-6.4,-.4]],'#8d8b72',.65);
  polygon(c,[[-6,-3.8],[-3.8,-4],[-2,-2.8],[.3,-3.7],[2.8,-3],[5.9,-3.8],[5.5,-1.9],[2,-1.6],[-.5,-2.1],[-3,-1.6],[-5.8,-2]],'#dfcba2',.35);
  polygon(c,[[-5.8,-.7],[-3.4,-1.1],[-1,.2],[1.7,-.8],[5.8,-.6],[5.3,1.1],[2.6,.8],[.4,1.7],[-2,1],[-5.7,1.5]],'#b5c4bc',.35);
  polygon(c,[[-5.8,2.4],[-3,2],[-1,3],[1.4,2.1],[3.4,2.7],[5.8,2],[5.7,4], [2,3.8],[-.4,4.2],[-3.4,3.8],[-5.7,4]],'#c89c75',.35);
  vacuumLine(c,-4.8,-3.1,-2.7,-2.5,'#99835e',.4);
  vacuumLine(c,-4.5,.1,-1.9,.6,'#edf0d8',.5);
  vacuumLine(c,2.1,-.1,4.7,.3,'#607774',.45);
  vacuumLine(c,-.9,-1.3,.6,-2.4,'#3c5152',.9);
  vacuumLine(c,-1.4,-1.8,-.5,-.8,'#d5dfd4',.65);
  c.restore();
}

export function drawCompactorWindow(c, phase, progress, time = 0) {
  vacuumBox(c,-13,2,26,17,'#203b43',3);
  const crush=phase==='loaded' ? smooth(progress) : phase==='telegraph' ? 1 : 0;
  const filling=phase==='sweep' || phase==='suction' && progress>.4;
  if(filling || phase==='loaded') {
    c.save(); c.beginPath(); c.roundRect(-11,3,22,15,2); c.clip();
    if(crush<.75) {
      for(let i=0;i<5;i++){
        c.save(); c.translate((i%3-1)*(6-3*crush)+Math.sin(time*9+i*2.1)*1.1*(1-crush),
          7+Math.floor(i/3)*5+Math.sin(time*12+i*1.7)*1.3*(1-crush));
        c.scale(.7*(1-crush*.25),.7); c.rotate(i+.22*Math.sin(time*10+i)); scrap(c,i%4); c.restore();
      }
    } else drawGarbageCube(c,0,10,1);
    const gap=11-crush*6;
    vacuumBox(c,-13,3,13-gap,15,'#90a3a1',.5);
    vacuumBox(c,gap,3,13-gap,15,'#90a3a1',.5); c.restore();
  } else if(phase==='telegraph') drawGarbageCube(c,0,10,1-unit(progress/.2));
  vacuumLine(c,-9,5,-4,5,'#8be0cf',.6);
  for(let i=0;i<3;i++) vacuumOval(c,16,5+i*4,.9,.9,
    Math.sin(time*4-i*1.7)>.25 ? (phase==='telegraph' ? '#ffad65' : '#9af3cc') : '#567878');
}

export function drawVacuumControlBody(c, pose) {
  vacuumBox(c,-29,-23,58,47,'#d9a42f',9);
  vacuumBox(c,-25,-19,50,39,'#f3c750',7);
  vacuumBox(c,-19,-15,38,12,'#173544',5);
  vacuumLine(c,-12,-9,-5,-9,'#8de2d0',2);
  vacuumLine(c,5,-9,12,-9,'#8de2d0',2);
  c.save();c.translate(0,-3);
  drawCompactorWindow(c,pose.phase,pose.progress,pose.time);c.restore();
}

function hose(c, points, time, active) {
  const trace=()=>{c.beginPath();c.moveTo(...points[0]);c.bezierCurveTo(...points[1],...points[2],...points[3]);};
  for(const [color,width] of [[VACUUM_INK,6.5],['#617c80',4.8],['#a5bab4',1.2]]){
    trace();c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  trace();c.setLineDash([.65,2.5]);c.strokeStyle='#304b52';c.lineWidth=4.6;c.stroke();c.setLineDash([]);
  if(active){trace();c.setLineDash([3,14]);c.lineDashOffset=time*30;c.strokeStyle='#a9f4d2';c.lineWidth=1.5;c.stroke();c.setLineDash([]);}
}

function hoverPropeller(c,x,y,time,reducedMotion) {
  // Eggshell-style two-blade rotor: shallow ellipse and swept blade trails.
  const angle=reducedMotion ? .3 : time*22, radius=25, tilt=.24;
  vacuumLine(c,x,y,x,y+11,VACUUM_INK,2);
  vacuumLine(c,x,y,x,y+11,'#9a9aa8',.8);
  for(const a of [angle,angle+Math.PI]) {
    if(!reducedMotion) {
      c.beginPath();c.ellipse(x,y,radius*.82,radius*tilt*.82,0,a-1.5,a);
      c.strokeStyle='rgba(206,212,228,.5)';c.lineWidth=2.5;c.stroke();
    }
    vacuumLine(c,x+Math.cos(a)*2,y+Math.sin(a)*tilt*2,
      x+Math.cos(a)*radius,y+Math.sin(a)*radius*tilt,'#3a3a48',2.4);
    vacuumLine(c,x+Math.cos(a)*4,y+Math.sin(a)*tilt*4,
      x+Math.cos(a)*radius*.92,y+Math.sin(a)*radius*tilt*.92,'#aeb5bb',1);
  }
  vacuumOval(c,x,y,1.8,1.2,'#8a8a98');
}

export function vacuumBrushPose({ x, y, corridor, attack }) {
  const sourceLane=attack?.sourceLane ?? 1, railY=sourceLane ? -corridor : 0;
  const sourceX=attack?.sourceX ?? x+35;
  const phase=attack?.phase, progress=attack?.progress || 0;
  const reach=phase==='sweep' ? 1 : phase==='suction' ? smooth(progress/.12)*(1-smooth((progress-.62)/.32))
    : phase==='waiting' && attack.sourceVisible ? .65 : 0;
  return { x:mix(x+37,sourceX,reach), y:mix(y-3,railY+(sourceLane?8:-8),reach), sourceX, railY, sourceLane };
}

// Body designs plug into one common brush / hose / compaction / discharge rig.
// A cube is a visual warning while descending; its existing rail collider starts
// at release, exactly where this path ends. No hidden mid-air collision.
export function drawVacuumAssembly(c, { x, y, corridor, attack, time=0,
  drawBody=drawVacuumControlBody, rotorHeight=34, reducedMotion=false }) {
  const phase=attack?.phase || 'idle', progress=attack?.progress || 0;
  const bob=reducedMotion ? 0 : Math.sin(time*2.1)*1.5;
  y+=bob;
  const brush=vacuumBrushPose({x,y,corridor,attack});
  const targetSign=attack?.lane ? -1 : 1, targetY=attack?.lane ? -corridor+7.5 : -7.5;
  c.save();c.lineCap='round';c.lineJoin='round';
  // The free hose has a gentle hanging loop; its endpoints remain attached.
  const brushSign=brush.sourceLane?-1:1;
  const pts=[[x+24,y+4],[x+59,y+30],[brush.x+25,brush.y-brushSign*26],[brush.x+2,brush.y-brushSign*3]];
  hose(c,pts,reducedMotion?0:time,phase==='suction'||phase==='sweep');
  c.save();c.translate(brush.x,brush.y);c.scale(1,brushSign);
  // Flexible corrugated hose meets the brush swivel directly.
  vacuumOval(c,2,-3,3,2.7,'#6a8584');
  vacuumBox(c,-14,-1,28,6,'#d3e3d8',2);
  vacuumBox(c,-11,-3,22,4,'#78958f',1.5);
  vacuumBox(c,-7,-3.6,5,1.8,'#e0bb65',.6);
  for(let i=-11;i<=11;i+=1.7) vacuumLine(c,i,5,i+.3,7,'#344e50',.65);
  for(const dx of [-12,12])vacuumOval(c,dx,3.7,1.8,1.8,'#344e50');
  vacuumLine(c,-10,1,10,1,'#e8ede1',.7);
  if(phase==='suction'||phase==='sweep') for(let i=-1;i<=1;i++){
    c.beginPath();c.moveTo(i*5,8);c.quadraticCurveTo(i*3,4,i*2,1);
    c.strokeStyle='#a1efcf';c.lineWidth=.65;c.stroke();
  }
  c.restore();
  hoverPropeller(c,x,y-rotorHeight,time,reducedMotion);
  c.save();c.translate(x,y);drawBody(c,{phase,progress,time:reducedMotion?0:time,targetSign});c.restore();
  // A hinged outlet, not a rigid pipe spanning the room.
  c.save();c.translate(x-29,y+targetSign*8);c.scale(1,targetSign);
  vacuumBox(c,-5,-4,10,8,phase==='telegraph'?'#efaf60':'#6d8588',1.5);
  vacuumLine(c,-5,-3,-5,3,VACUUM_INK,2);c.restore();
  if(phase==='telegraph') {
    const p=smooth((progress-.2)/.8), startX=x-37, startY=y+targetSign*9;
    // The side outlet clears every candidate's face, including the taller
    // janitor when firing upwards, then meets the shared rail launch point.
    const a=[startX,startY],b=[x-42,y+targetSign*40],d=[x-13.5,targetY-targetSign*15],e=[x-13.5,targetY];
    const u=1-p;
    const cubeX=u*u*u*a[0]+3*u*u*p*b[0]+3*u*p*p*d[0]+p*p*p*e[0];
    const cubeY=u*u*u*a[1]+3*u*u*p*b[1]+3*u*p*p*d[1]+p*p*p*e[1];
    // Static landing brackets communicate the destination before the drop.
    const surface=attack.lane?-corridor:0;
    for(const dx of [-14,14+((attack.count||1)-1)*24]) vacuumLine(c,x-13.5+dx,surface-targetSign*.8,x-13.5+dx,surface-targetSign*4,'#ffd689',1);
    c.save();c.setLineDash([1,4]);c.beginPath();c.moveTo(...a);c.bezierCurveTo(...b,...d,...e);
    c.strokeStyle='rgba(255,213,139,.4)';c.lineWidth=.7;c.stroke();c.restore();
    if(progress>=.2) {
      c.save();c.translate(cubeX,cubeY);c.scale(1,targetSign);
      for(let i=0;i<(attack.count||1);i++) drawGarbageCube(c,i*24*p,0);c.restore();
    }
  }
  c.restore();
}
