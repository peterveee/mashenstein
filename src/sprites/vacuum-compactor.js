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

// 14 by 10 is the existing jump footprint. The visible front face is square;
// the smaller side and top give the compacted rubbish a three-quarter view.
export function drawGarbageCube(c, x, y, scale = 1) {
  c.save(); c.translate(x,y); c.scale(scale,scale);
  polygon(c,[[-6,-3],[3,-3],[3,5],[-6,5]],'#8e9580');
  polygon(c,[[-6,-3],[-2,-5],[7,-5],[3,-3]],'#c0b89a');
  polygon(c,[[3,-3],[7,-5],[7,3],[3,5]],'#626f68');
  polygon(c,[[-5,-2],[-2,-1],[-3,1],[-5,1]],'#e9d7b1',.4);
  polygon(c,[[-1,1],[2,0],[2,3],[0,4]],'#a7bec0',.4);
  vacuumLine(c,-5,3,-2,2,'#546a66',.55); vacuumLine(c,0,-2,2,-1,'#d7c687',.6);
  vacuumLine(c,5,-2,5,2,'#93a5a0',.5);
  vacuumOval(c,-1,-.5,.7,.7,'#354b50');
  c.restore();
}

export function drawCompactorWindow(c, phase, progress, time = 0) {
  vacuumBox(c,-13,2,26,17,'#203b43',3);
  const crush=phase==='loaded' ? smooth(progress) : phase==='telegraph' ? 1 : 0;
  const filling=phase==='suction' && progress>.4;
  if(filling || phase==='loaded') {
    c.save(); c.beginPath(); c.roundRect(-11,3,22,15,2); c.clip();
    if(crush<.75) {
      for(let i=0;i<5;i++){
        c.save(); c.translate((i%3-1)*(6-3*crush),7+Math.floor(i/3)*5);
        c.scale(.7*(1-crush*.25),.7); c.rotate(i+.05*Math.sin(time*30)); scrap(c,i%4); c.restore();
      }
    } else drawGarbageCube(c,0,10,.8);
    const gap=11-crush*6;
    vacuumBox(c,-13,3,13-gap,15,'#90a3a1',.5);
    vacuumBox(c,gap,3,13-gap,15,'#90a3a1',.5); c.restore();
  } else if(phase==='telegraph') drawGarbageCube(c,0,10,.8*(1-unit(progress/.2)));
  vacuumLine(c,-9,5,-4,5,'#8be0cf',.6);
  for(let i=0;i<3;i++) vacuumOval(c,16,5+i*4,.9,.9,
    phase==='telegraph' ? '#ffad65' : crush>i/3 || filling ? '#9af3cc' : '#567878');
}

export function drawVacuumControlBody(c, pose) {
  vacuumBox(c,-29,-23,58,47,'#d9a42f',9);
  vacuumBox(c,-25,-19,50,39,'#f3c750',7);
  vacuumBox(c,-19,-15,38,12,'#173544',5);
  vacuumLine(c,-13,-9,12,-9,'#8de2d0',2);
  drawCompactorWindow(c,pose.phase,pose.progress,pose.time);
}

function hose(c, points, time, active) {
  const trace=()=>{c.beginPath();c.moveTo(...points[0]);c.bezierCurveTo(...points[1],...points[2],...points[3]);};
  for(const [color,width] of [[VACUUM_INK,6.5],['#617c80',4.8],['#a5bab4',1.2]]){
    trace();c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  trace();c.setLineDash([.65,2.5]);c.strokeStyle='#304b52';c.lineWidth=4.6;c.stroke();c.setLineDash([]);
  if(active){trace();c.setLineDash([3,14]);c.lineDashOffset=time*30;c.strokeStyle='#a9f4d2';c.lineWidth=1.5;c.stroke();c.setLineDash([]);}
}

export function vacuumBrushPose({ x, y, corridor, attack }) {
  const sourceLane=attack?.sourceLane ?? 1, railY=sourceLane ? -corridor : 0;
  const sourceX=attack?.sourceX ?? x+35;
  const phase=attack?.phase, progress=attack?.progress || 0;
  const reach=phase==='suction' ? smooth(progress/.12)*(1-smooth((progress-.62)/.32))
    : phase==='waiting' && attack.sourceVisible ? .65 : 0;
  return { x:mix(x+37,sourceX,reach), y:mix(y-3,railY+(sourceLane?8:-8),reach), sourceX, railY, sourceLane };
}

// Body designs plug into one common brush / hose / compaction / discharge rig.
// A cube is a visual warning while descending; its existing rail collider starts
// at release, exactly where this path ends. No hidden mid-air collision.
export function drawVacuumAssembly(c, { x, y, corridor, attack, time=0,
  drawBody=drawVacuumControlBody, reducedMotion=false }) {
  const phase=attack?.phase || 'idle', progress=attack?.progress || 0;
  const bob=reducedMotion ? 0 : Math.sin(time*2.1)*1.5;
  y+=bob;
  const brush=vacuumBrushPose({x,y,corridor,attack});
  const targetSign=attack?.lane ? -1 : 1, targetY=attack?.lane ? -corridor+5 : -5;
  c.save();c.lineCap='round';c.lineJoin='round';
  // The free hose has a gentle hanging loop; its endpoints remain attached.
  const pts=[[x+24,y+4],[x+50,y+22],[brush.x+25,brush.y-targetSign*18],[brush.x,brush.y]];
  hose(c,pts,reducedMotion?0:time,phase==='suction');
  c.save();c.translate(brush.x,brush.y);c.scale(1,brush.sourceLane?-1:1);
  vacuumBox(c,-10,-2,20,6,'#d3e3d8',2);vacuumBox(c,-5,-5,10,4,'#e5bc59',1.5);
  for(let i=-8;i<=8;i+=2) vacuumLine(c,i,4,i+.5,7,'#3d5557',.8);
  vacuumLine(c,-7,0,7,0,'#759d98',.7);
  if(phase==='suction') for(let i=-1;i<=1;i++){
    c.beginPath();c.moveTo(i*5,8);c.quadraticCurveTo(i*3,4,i*2,1);
    c.strokeStyle='#a1efcf';c.lineWidth=.65;c.stroke();
  }
  c.restore();
  // Small hover pods leave the hands and the brush visually distinct.
  for(const side of [-1,1]) {
    vacuumBox(c,x+side*19-5,y+19,10,7,'#476970',3);
    vacuumOval(c,x+side*19,y+27,3,1.5,'#88dacb');
    vacuumLine(c,x+side*19,y+29,x+side*19,y+33+(reducedMotion?0:Math.sin(time*9+side)*1.2),'#8ee0d1',1);
  }
  c.save();c.translate(x,y);drawBody(c,{phase,progress,time:reducedMotion?0:time,targetSign});c.restore();
  // A hinged outlet, not a rigid pipe spanning the room.
  c.save();c.translate(x-29,y+targetSign*8);c.scale(1,targetSign);
  vacuumBox(c,-5,-4,10,8,phase==='telegraph'?'#efaf60':'#6d8588',1.5);
  vacuumLine(c,-5,-3,-5,3,VACUUM_INK,2);c.restore();
  if(phase==='telegraph') {
    const p=smooth((progress-.2)/.8), startX=x-37, startY=y+targetSign*9;
    // The side outlet clears every candidate's face, including the taller
    // janitor when firing upwards, then meets the shared rail launch point.
    const a=[startX,startY],b=[x-42,y+targetSign*40],d=[x-17,targetY-targetSign*15],e=[x-17,targetY];
    const u=1-p;
    const cubeX=u*u*u*a[0]+3*u*u*p*b[0]+3*u*p*p*d[0]+p*p*p*e[0];
    const cubeY=u*u*u*a[1]+3*u*u*p*b[1]+3*u*p*p*d[1]+p*p*p*e[1];
    // Static landing brackets communicate the destination before the drop.
    const surface=attack.lane?-corridor:0;
    for(const dx of [-10,10]) vacuumLine(c,x-17+dx,surface-targetSign*.8,x-17+dx,surface-targetSign*4,'#ffd689',1);
    c.save();c.setLineDash([1,4]);c.beginPath();c.moveTo(...a);c.bezierCurveTo(...b,...d,...e);
    c.strokeStyle='rgba(255,213,139,.4)';c.lineWidth=.7;c.stroke();c.restore();
    if(progress>=.2) drawGarbageCube(c,cubeX,cubeY);
  }
  c.restore();
}
