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
  c.save(); c.translate(x, railY - (lane ? 2 : 0)); c.scale(1, lane ? -1 : 1);
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

// Square, flat side-on compressed rubbish; 17 × 17 on the running surface.
export function drawGarbageCube(c, x, y, scale = 1.5) {
  c.save(); c.translate(x,y); c.scale(scale,scale);
  polygon(c,[[-5.6,-5.4],[-3.8,-5.7],[-1.5,-5.4],[.4,-5.7],[3,-5.4],[5.6,-5.5],[5.7,-2],[5.5,.3],[5.7,3],[5.4,5.5],[2.7,5.4],[0,5.7],[-3,5.4],[-5.5,5.5],[-5.7,2],[-5.5,-.4]],'#8d8b72',.65);
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

export function drawCompactorWindow(c, phase, progress, time = 0, teeth = false,
  lightX = 16, lightTop = 5) {
  vacuumBox(c,-13,2,26,17,'#203b43',3);
  const crush=phase==='loaded' ? smooth(progress) : phase==='telegraph' ? 1 : 0;
  // Intake ends at the head socket. The mouth only shows the compacted cube
  // forming between its teeth; loose scraps never travel into this window.
  if(phase==='loaded') {
    c.save(); c.beginPath(); c.roundRect(-11,3,22,15,2); c.clip();
    const cubeBlend=teeth ? smooth((crush-.48)/.45) : crush>=.75 ? 1 : 0;
    if(cubeBlend>0) {
      c.save();c.globalAlpha=cubeBlend;
      drawGarbageCube(c,0,10,.8+.2*cubeBlend);c.restore();
    }
    if(!teeth) {
      const gap=11-crush*6;
      vacuumBox(c,-13,3,13-gap,15,'#90a3a1',.5);
      vacuumBox(c,gap,3,13-gap,15,'#90a3a1',.5);
    }
    c.restore();
  } else if(phase==='telegraph') drawGarbageCube(c,0,10,1-unit(progress/.2));
  if(teeth) {
    // Opposed compacting teeth share the mouth opening with the loose rubbish.
    // They close only after the intake reaches the compaction chamber.
    const bite=phase==='loaded' ? smooth(progress)
        : phase==='telegraph' ? 1-smooth(progress/.2) : 0;
    const depth=1.8+5.7*bite;
    c.save();c.beginPath();c.roundRect(-11,3,22,15,2);c.clip();
    for(const x of [-7.5,-2.5,2.5,7.5]) {
      polygon(c,[[x-2,3],[x+2,3],[x+1.6,3+depth],[x-1.6,3+depth]],x===2.5?'#e9b64d':'#f6f3e8',.45);
      polygon(c,[[x-2,18],[x+2,18],[x+1.6,18-depth],[x-1.6,18-depth]],'#f6f3e8',.45);
    }
    c.restore();
  }
  for(let i=0;i<3;i++) vacuumOval(c,lightX,lightTop+i*4,.9,.9,
    Math.sin(time*4-i*1.7)>.25 ? (phase==='telegraph' ? '#ffad65' : '#9af3cc') : '#567878');
}

export function drawVacuumControlBody(c, pose) {
  vacuumBox(c,-25,-21,50,42,'#d9a42f',8);
  vacuumBox(c,-22,-18,44,36,'#f3c750',6);
  vacuumBox(c,-17,-14,34,10,'#173544',5);
  // The dash sensors react to the work without becoming a separate cartoon face.
  const straining=pose.phase==='telegraph';
  const focused=pose.phase==='suction';
  const squinting=pose.phase==='loaded';
  const eyeSpan=squinting?5:7;
  for(const side of [-1,1]) {
    const cx=side*8.5;
    const outerY=straining?-11:focused?-10:-9;
    const innerY=straining?-8:focused?-8.5:-9;
    vacuumLine(c,cx-side*eyeSpan/2,innerY,cx+side*eyeSpan/2,outerY,'#8de2d0',2);
  }
  const mouthScale=pose.phase==='suction' ? 1+0.1*smooth(pose.progress)
    : pose.phase==='loaded' ? 1.1-0.48*smooth(pose.progress)
      : straining ? 0.62+0.38*smooth(pose.progress/.2) : 1;
  // Give the eye panel a clear strip of yellow casing above the shorter mouth.
  c.save();c.translate(0,9);c.scale(.78,.82*mouthScale);c.translate(0,-10.5);
  drawCompactorWindow(c,pose.phase,pose.progress,pose.time,true,20,6.5);
  c.restore();
}

function hose(c, points, time, active) {
  const trace=()=>{c.beginPath();c.moveTo(...points[0]);c.bezierCurveTo(...points[1],...points[2],...points[3]);};
  for(const [color,width] of [[VACUUM_INK,4.8],['#617c80',3.6],['#a5bab4',.9]]){
    trace();c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  trace();c.setLineDash([.5,2.5]);c.strokeStyle='#304b52';c.lineWidth=3.2;c.stroke();c.setLineDash([]);
  if(active){trace();c.setLineDash([3,14]);c.lineDashOffset=time*30;c.strokeStyle='#a9f4d2';c.lineWidth=1;c.stroke();c.setLineDash([]);}
}

export function vacuumBrushPose({ x, y, corridor, attack }) {
  const sourceLane=attack?.sourceLane ?? 1, railY=sourceLane ? -corridor : 0;
  // The room moves under one fixed pickup point. Only a gravity turn retracts
  // the head; chewing and ejecting do not make it hunt across the surface.
  return { x:x-35, y:railY+(sourceLane?4:-4), railY, sourceLane };
}

// Body designs plug into one common brush / hose / compaction / discharge rig.
// A cube is a visual warning while descending; its existing rail collider starts
// at release, exactly where this path ends. No hidden mid-air collision.
export function drawVacuumAssembly(c, { x, y, corridor, attack, time=0, lane=0, flip=null, flipPrep=0,
  drawBody=drawVacuumControlBody, reducedMotion=false }) {
  const phase=attack?.phase || 'idle', progress=attack?.progress || 0;
  const bob=reducedMotion ? 0 : Math.sin(time*2.1)*1.5;
  y+=bob;
  const brush=vacuumBrushPose({x,y,corridor,attack});
  // Draw from the gate distance and the hero's saved transfer clock. The hose
  // pulls in before the crossing, the whole shell turns, then the brush extends.
  const turn=flip ? smooth(flip.elapsed / Math.min(flip.duration,.55)) : 1;
  // Keep contact while working; fold into the socket for a polarity change.
  const retract=flip ? 1-smooth((turn-.72)/.28) : smooth(flipPrep);
  const angle=flip ? (flip.from ? Math.PI : 0)+Math.PI*turn : lane ? Math.PI : 0;
  const ca=Math.cos(angle), sa=Math.sin(angle);
  const local=(dx,dy)=>[x+dx*ca-dy*sa,y+dx*sa+dy*ca];
  const targetSign=attack?.lane ? -1 : 1, targetY=attack?.lane ? -corridor+7.5 : -7.5;
  c.save();c.lineCap='round';c.lineJoin='round';
  // The free hose has a gentle hanging loop; its endpoints remain attached.
  const brushSign=brush.sourceLane?-1:1;
  const head=local(0,-24), parkedBrush=local(0,-40);
  let brushX=mix(brush.x,parkedBrush[0],retract), brushY=mix(brush.y,parkedBrush[1],retract);
  const outwardX=Math.sin(angle), outwardY=-Math.cos(angle);
  const clearance=(brushX-x)*outwardX+(brushY-y)*outwardY;
  if(clearance<31) {
    brushX+=outwardX*(31-clearance);
    brushY+=outwardY*(31-clearance);
  }
  // The bristles always face out from the rotating casing, including while
  // parked. A stale attack source rail must never turn them toward the face.
  const brushAngle=angle+Math.PI;
  // The hose rises from a socket above the eye housing. Its parked brush stays
  // over that socket during a turn, then reaches the opposite rail.
  const headControl=local(0,-56), parkedControl=local(0,-31), tailControl=local(0,-35);
  const pts=[head,
    [mix(headControl[0],parkedControl[0],retract),mix(headControl[1],parkedControl[1],retract)],
    [mix(brush.x-27,tailControl[0],retract),mix(brush.y-brushSign*26,tailControl[1],retract)],
    [brushX-2*Math.cos(brushAngle)+3*Math.sin(brushAngle),
      brushY-2*Math.sin(brushAngle)-3*Math.cos(brushAngle)]];
  hose(c,pts,reducedMotion?0:time,phase==='suction'||phase==='sweep');
  c.save();c.translate(brushX,brushY);c.rotate(brushAngle);
  // Flexible corrugated hose meets the brush swivel directly.
  vacuumOval(c,-2,-3,3,2.7,'#6a8584');
  vacuumBox(c,-14,-1,28,6,'#d3e3d8',2);
  vacuumBox(c,-11,-3,22,4,'#78958f',1.5);
  vacuumBox(c,-7,-3.6,5,1.8,'#e0bb65',.6);
  for(let i=-11;i<=11;i+=1.7) vacuumLine(c,i,5,i+.3,7,'#344e50',.65);
  for(const dx of [-12,12])vacuumOval(c,dx,3.7,1.8,1.8,'#344e50');
  vacuumLine(c,-10,1,10,1,'#e8ede1',.7);
  c.restore();
  c.save();c.translate(x,y);c.rotate(angle);
  // Seat the narrow socket behind the casing so its lower edge is hidden by
  // the face outline instead of crossing it.
  vacuumBox(c,-3.5,-24,7,5,'#6d8588',1.3);
  // The outlet uses the same tucked mount below the casing. Its top edge is
  // covered by the body rather than painted over the lower face outline.
  vacuumBox(c,-8.5,19,17,7,phase==='telegraph'?'#efaf60':'#6d8588',1);
  drawBody(c,{phase,progress,time:reducedMotion?0:time,targetSign});
  c.restore();
  if(phase==='telegraph') {
    const p=smooth((progress-.2)/.8);
    const a=local(0,30),b=local(0,53),d=[x,targetY-targetSign*15],e=[x,targetY];
    const u=1-p;
    const cubeX=u*u*u*a[0]+3*u*u*p*b[0]+3*u*p*p*d[0]+p*p*p*e[0];
    const cubeY=u*u*u*a[1]+3*u*u*p*b[1]+3*u*p*p*d[1]+p*p*p*e[1];
    // Static landing brackets communicate the destination before the drop.
    const surface=attack.lane?-corridor:0;
    for(const dx of [-14,14+((attack.count||1)-1)*24]) vacuumLine(c,x+dx,surface-targetSign*.8,x+dx,surface-targetSign*4,'#ffd689',1);
    c.save();c.setLineDash([1,4]);c.beginPath();c.moveTo(...a);c.bezierCurveTo(...b,...d,...e);
    c.strokeStyle='rgba(255,213,139,.4)';c.lineWidth=.7;c.stroke();c.restore();
    if(progress>=.2) {
      c.save();c.translate(cubeX,cubeY);c.scale(1,targetSign);
      for(let i=0;i<(attack.count||1);i++) drawGarbageCube(c,i*24*p,0);c.restore();
    }
  }
  c.restore();
}
