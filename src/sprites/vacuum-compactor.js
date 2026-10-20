// Shared by the campaign cleaner and its design bakeoff. Coordinates are smooth
// world units; the gallery paints the same paths into a desktop-density canvas.
import { OUTLINE_SCALE } from './outline.js';

export const VACUUM_INK = '#20353b';
const VACUUM_OUTLINE = .55 * OUTLINE_SCALE;
export const unit = n => Math.max(0, Math.min(1, n));
const smooth = n => { const p = unit(n); return p * p * (3 - 2 * p); };
const mix = (a, b, p) => a + (b - a) * p;
export function vacuumLine(c, x, y, xx, yy, color, width = .8) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function vacuumBox(c, x, y, w, h, fill, r = 2) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  c.strokeStyle = VACUUM_INK; c.lineWidth = VACUUM_OUTLINE; c.stroke();
}
export function vacuumOval(c, x, y, rx, ry, fill) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  c.strokeStyle = VACUUM_INK; c.lineWidth = VACUUM_OUTLINE; c.stroke();
}
function polygon(c, pts, fill, width = .55) {
  c.beginPath(); pts.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = VACUUM_INK; c.lineWidth = width * OUTLINE_SCALE; c.stroke();
}
function vacuumGradient(c, top, bottom, colors) {
  const fill=c.createLinearGradient(0,top,0,bottom);
  colors.forEach((color,i)=>fill.addColorStop(i/(colors.length-1),color));
  return fill;
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

const MOUTH_SCRAPS = [
  { x:-7, y:9, kind:0, angle:-.4 }, { x:4, y:8, kind:2, angle:.5 },
  { x:-2, y:12, kind:1, angle:.2 }, { x:8, y:12, kind:3, angle:-.3 },
  { x:-8, y:14, kind:1, angle:.7 }, { x:2, y:14, kind:0, angle:-.6 },
];
// THE SCRAPS ARRIVE A BEAT AFTER THE BRUSH TAKES THEM (Peter, 20 Oct 2026: "we should
// see it shortly after it's sucked in"). Piece i of the rail's pile reaches the brush at
// suction progress .38 + i*.045 (drawVacuumDebris); its scrap turns up in the mouth
// ARRIVE_AFTER later, the trip up the hose, never before the brush has it.
const ARRIVE_AFTER = .13;   // of the 1.5 s suction: 0.2 s
function drawMouthScraps(c, phase, progress, time, finish) {
  if(phase!=='suction' && phase!=='loaded') return;
  const loose=phase==='loaded' ? 1-smooth((finish-.28)/.58) : 1;
  for(let i=0;i<MOUTH_SCRAPS.length;i++) {
    const item=MOUTH_SCRAPS[i];
    const arrival=phase==='loaded' ? 1 : unit((progress-(.38+i*.045)-ARRIVE_AFTER)/.08);
    if(arrival<=0 || loose<=0) continue;
    const flutter=phase==='loaded' ? 1.2 : .7;
    const x=mix(item.x,0,finish*.72)+Math.sin(time*15+i*2.4)*flutter*(1-finish);
    const y=mix(item.y,10.5,finish*.68)+Math.cos(time*18+i*1.7)*.8*(1-finish);
    c.save();c.globalAlpha=arrival*loose;c.translate(x,y);
    c.rotate(item.angle+Math.sin(time*11+i*2)*.22*(1-finish));
    const size=(.48+.06*(i%3))*(1-finish*.55);
    c.scale(size,size);scrap(c,item.kind);c.restore();
  }
}

// WHAT THE SWEEP HAS JUST TAKEN IN: between cube attacks the brush keeps lifting litter
// off the rail, and that litter now shows in the mouth too — a couple of scraps per pickup,
// a beat after it (the hose), tumbling for about a second and a half before they are
// gone. `intake` is [{ age, seed }]: seconds since the pickup, and which scraps. Derived
// from the clock like everything else here, so a rewind restores it.
const INTAKE_ARRIVE = .2, INTAKE_HOLD = 1.4, INTAKE_FADE = .3;
export const VACUUM_INTAKE_LIFE = INTAKE_ARRIVE + INTAKE_HOLD + INTAKE_FADE;
function drawMouthIntake(c, intake, time) {
  for(const {age, seed} of intake) {
    const a=smooth((age-INTAKE_ARRIVE)/.1)*(1-smooth((age-INTAKE_ARRIVE-INTAKE_HOLD)/INTAKE_FADE));
    if(a<=0) continue;
    const item=MOUTH_SCRAPS[seed%MOUTH_SCRAPS.length];
    const settle=smooth((age-INTAKE_ARRIVE)/.35);
    const x=item.x+Math.sin(time*9+seed*2.1)*.9;
    const y=mix(4,item.y,settle)+Math.cos(time*11+seed*1.3)*.7;
    c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(item.angle+time*1.5*(seed%2?1:-1));
    const size=.45+.05*(seed%3);c.scale(size,size);scrap(c,item.kind);c.restore();
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

// Keep each cube's occasional hardware detail fixed from its authored launch
// time and position in a paired drop, including through rewind and respawn.
export function garbageCubeVariant(launchAt = 0, index = 0) {
  let seed=(Math.round(launchAt*1000)^Math.imul(index+1,0x9e3779b9))>>>0;
  seed=Math.imul(seed^(seed>>>16),0x7feb352d);
  seed=Math.imul(seed^(seed>>>15),0x846ca68b);
  const hardware=((seed^(seed>>>16))>>>0)%6;
  return hardware===0 ? 3 : hardware===5 ? 4 : 0;
}

// F / Crushed Mix: a square, flat side-on press of thirteen scraps.
// A screw or bolt is embedded in some cubes; the others have no hardware.
export function drawGarbageCube(c, x, y, scale = 1.5, variant = 0) {
  c.save(); c.translate(x,y); c.scale(scale,scale);
  // The source contour is divided by 1.5 so a landed cube has the standard
  // 0.55-unit outline after its visual enlargement.
  polygon(c,[[-5.5,-5.4],[-2.7,-5.5],[.4,-5.3],[3,-5.5],[5.5,-5.3],[5.5,-2],[5.3,1],[5.5,5.4],[2.3,5.5],[-1,5.3],[-5.5,5.5],[-5.4,2],[-5.5,-1]],'#9aaba5',.55/1.5);
  const chip=(pts,fill)=>polygon(c,pts,fill,.3);
  chip([[-4.8,-4.8],[-2.2,-4.8],[-2.5,-3],[-4.8,-2.7]],'#c99d78');
  chip([[-1.9,-4.8],[.9,-4.8],[.3,-3.1],[-1.4,-2.7]],'#e8d6b2');
  chip([[1.2,-4.8],[4.8,-4.8],[4.8,-3.2],[3.7,-2.5],[.8,-3]],'#748f95');
  chip([[-4.8,-2.4],[-2.8,-2.6],[-1.5,-1.1],[-3.1,.4],[-4.8,-.3]],'#899fa1');
  chip([[-2.3,-2.2],[-.1,-2.7],[1.5,-1.3],[.4,.4],[-1.9,-.8]],'#d5bc94');
  chip([[2,-2.4],[4.8,-2.8],[4.8,-.7],[2.8,.2],[.9,-.1]],'#d7a782');
  chip([[-4.8,.1],[-3.3,.7],[-3.5,2.5],[-4.8,2.2]],'#ead8b6');
  chip([[-3,.7],[-1.5,-.4],[.1,.8],[-.7,2.7],[-2.9,2.9]],'#6f8a8e');
  chip([[.4,.9],[2.2,.1],[3.1,1.6],[1.2,2.8],[-.3,2.4]],'#e6d1a9');
  chip([[3.4,.3],[4.8,-.1],[4.8,2.4],[3,2.8],[2.5,1.8]],'#9ba69a');
  chip([[-4.8,2.6],[-3.3,3],[-1.9,3.2],[-1.1,4.8],[-4.8,4.8]],'#ba8e74');
  chip([[-1.5,3.1],[.5,2.9],[1.5,4.8],[-.7,4.8]],'#b5beb4');
  chip([[1.7,3.2],[3.1,3.1],[4.8,2.8],[4.8,4.8],[2,4.8]],'#dac29f');
  if(variant===3) {
    vacuumOval(c,2,-1.5,.72,.72,'#e7ddbe');
    vacuumLine(c,1.6,-1.5,2.4,-1.5,'#627679',.22);
  } else if(variant===4) {
    polygon(c,[[-2.1,1.1],[-1.55,.5],[-.65,.5],[-.1,1.1],[-.65,1.7],[-1.55,1.7]],'#e7ddbe',.3);
    vacuumLine(c,-1.6,1.1,-.6,1.1,'#627679',.22);
  }
  c.restore();
}

// The landed obstacle stays fixed on the rail. Its painted shell flattens,
// briefly stretches back past its resting shape, then settles without a hop.
export function drawGarbageCubeImpact(c, x, y, age, variant = 0) {
  const squash=age<.09 ? Math.sin(Math.PI*age/.09) : 0;
  const expand=age>.09 && age<.2 ? Math.sin(Math.PI*(age-.09)/.11) : 0;
  c.save();c.translate(x,y+8.5);
  c.scale(1+.24*squash-.06*expand,1-.34*squash+.1*expand);
  drawGarbageCube(c,0,-8.5,1.5,variant);c.restore();
  if(age<.18) {
    const puff=1-unit(age/.18);
    c.save();c.globalAlpha=.7*puff;
    for(const side of [-1,1]) {
      vacuumOval(c,x+side*(9+age*30),y+6-age*9,2.8+age*9,1.2,'#e2bd80');
      vacuumLine(c,x+side*8,y+5,x+side*(13+age*18),y+2-age*8,'#f8dda0',.9);
    }
    c.restore();
  }
}

function compactorChew(phase, progress, count = 1, reducedMotion = false) {
  if(phase==='loaded') {
    const bites=Math.min(3,Math.max(2,count+1));
    return {bite:reducedMotion ? smooth(progress) : Math.sin(Math.PI*(bites-.5)*progress)**2,
      finish:smooth((progress-.72)/.28)};
  }
  if(phase==='telegraph') return {bite:1-smooth(progress/.2),finish:1};
  return {bite:0,finish:0};
}

export function drawCompactorWindow(c, phase, progress, time = 0, teeth = false,
  lightX = 16, lightTop = 5, count = 1, reducedMotion = false, cubeVariant = 0, intake = null) {
  vacuumBox(c,-13,2,26,17,'#203b43',3);
  if(intake?.length && phase!=='suction' && phase!=='loaded' && phase!=='telegraph') {
    c.save(); c.beginPath(); c.roundRect(-11,3,22,15,2); c.clip();
    drawMouthIntake(c,intake,time);
    c.restore();
  }
  const {bite,finish}=compactorChew(phase,progress,count,reducedMotion);
  // Debris enters through the head and churns inside the mouth before the
  // teeth close. Nothing is drawn travelling from the brush into the mouth.
  if(phase==='suction' || phase==='loaded') {
    c.save(); c.beginPath(); c.roundRect(-11,3,22,15,2); c.clip();
    drawMouthScraps(c,phase,progress,time,finish);
    const cubeBlend=teeth ? smooth((finish-.48)/.45) : finish>=.75 ? 1 : 0;
    if(phase==='loaded' && cubeBlend>0) {
      c.save();c.globalAlpha=cubeBlend;
      drawGarbageCube(c,0,10,.8+.2*cubeBlend,cubeVariant);c.restore();
    }
    if(phase==='loaded' && !teeth) {
      const gap=11-bite*6;
      vacuumBox(c,-13,3,13-gap,15,'#90a3a1',.5);
      vacuumBox(c,gap,3,13-gap,15,'#90a3a1',.5);
    }
    c.restore();
  } else if(phase==='telegraph') drawGarbageCube(c,0,10,1-unit(progress/.2),cubeVariant);
  if(teeth) {
    // Two quick chomps make one cube; a paired drop gets a third chomp.
    const depth=1.8+(4.3+1.4*finish)*bite;
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
  drawCompactorWindow(c,pose.phase,pose.progress,pose.time,true,20,6.5,pose.count);
  c.restore();
}

export function drawVacuumMawBody(c, pose) {
  // MAW: a dark service shell over a broad lime compaction jaw.
  vacuumBox(c,-24,-21,48,42,vacuumGradient(c,-21,21,['#65526d','#594760','#4e3e58']),8);
  vacuumBox(c,-21,-18,42,17,vacuumGradient(c,-18,-1,['#85718e','#786482','#6d5a77']),5);
  // The jaw begins at y=-1, so centre the visor in the visible purple panel.
  vacuumBox(c,-18,-15.5,36,12,vacuumGradient(c,-15.5,-3.5,['#2b414b','#20333e','#1b2d37']),3);
  const {bite}=compactorChew(pose.phase,pose.progress,pose.count,pose.reducedMotion);
  // Keep the dashes level. They dip with each bite and rise as the teeth open;
  // suction and ejection leave them in their neutral position.
  const eyeBite=pose.phase==='loaded' ? bite*(1-smooth((pose.progress-.88)/.12)) : 0;
  const eyeSpan=6.2, eyeY=-9.5+eyeBite*1.6;
  for(const side of [-1,1]) {
    const outerX=side*11, innerX=side*(11-eyeSpan);
    vacuumLine(c,outerX,eyeY,innerX,eyeY,'#d7ec91',1.65);
  }
  polygon(c,[[-24,2],[-19,-1],[19,-1],[24,2],[24,12],[16,21],[-16,21],[-24,12]],
    vacuumGradient(c,-1,21,['#c6d478','#b5c65e','#a8bb56']));
  // A three-unit inset follows every outer edge, including both bevels.
  polygon(c,[[-21,3.7],[-18.17,2],[18.17,2],[21,3.7],[21,10.86],[14.65,18],[-14.65,18],[-21,10.86]],
    vacuumGradient(c,2,18,['#e2e6aa','#d3d991','#cbd58a']));
  // The mouth sits at the inset's centre (0,10), with equal vertical clearance.
  // It compresses for each bite, then opens for the gravity-aware discharge.
  c.save();c.translate(0,10);c.scale(.85,.67*(1-.2*bite));c.translate(0,-10.5);
  drawCompactorWindow(c,pose.phase,pose.progress,pose.time,true,19,6.5,
    pose.count,pose.reducedMotion,pose.cubeVariant,pose.intake);c.restore();
  for(const side of [-1,1]) {
    vacuumOval(c,side*22,3,.8,.8,'#7b8950');
  }
}

function hosePoint(points,t) {
  const u=1-t;
  const x=u*u*u*points[0][0]+3*u*u*t*points[1][0]+3*u*t*t*points[2][0]+t*t*t*points[3][0];
  const y=u*u*u*points[0][1]+3*u*u*t*points[1][1]+3*u*t*t*points[2][1]+t*t*t*points[3][1];
  const dx=3*u*u*(points[1][0]-points[0][0])+6*u*t*(points[2][0]-points[1][0])+3*t*t*(points[3][0]-points[2][0]);
  const dy=3*u*u*(points[1][1]-points[0][1])+6*u*t*(points[2][1]-points[1][1])+3*t*t*(points[3][1]-points[2][1]);
  const length=Math.hypot(dx,dy)||1;
  return {x,y,nx:-dy/length,ny:dx/length};
}
function hoseStroke(c,points,color,width) {
  c.beginPath();c.moveTo(...points[0]);c.bezierCurveTo(...points[1],...points[2],...points[3]);
  c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function hoseRib(c,points,t,half,color,width) {
  const p=hosePoint(points,t);
  vacuumLine(c,p.x-p.nx*half,p.y-p.ny*half,p.x+p.nx*half,p.y+p.ny*half,color,width);
}
export function drawVacuumSpiralHose(c,points) {
  // Give the tube its body in purple, then one contour at the same weight as
  // the other obstacle outlines. A second dark sleeve made the edge look thick.
  const bodyWidth=3.6;
  hoseStroke(c,points,VACUUM_INK,bodyWidth+2*VACUUM_OUTLINE);
  hoseStroke(c,points,'#84768a',bodyWidth);
  for(let t=.07;t<.95;t+=.052) {
    const a=hosePoint(points,t),b=hosePoint(points,Math.min(.99,t+.022));
    vacuumLine(c,a.x-a.nx*1.05,a.y-a.ny*1.05,b.x+b.nx*1.05,b.y+b.ny*1.05,'#a99eaa',.28);
  }
  hoseRib(c,points,.045,1.1,'#bdc596',.5);
  hoseRib(c,points,.95,1.1,'#bdc596',.5);
}
// A chrome floor head (Peter, 20 Oct 2026): narrow across its back, flaring out to a wide
// mouth on the rail it cleans, nine units deep, bristles on the rail. The banded fill is a
// polished bar catching the room's light. The hose drops into a collar centred on its back
// (BRUSH_NECK, where drawVacuumAssembly ends the hose).
export const BRUSH_NECK = -7;
export function drawVacuumSpiralHead(c) {
  vacuumBox(c,-2.8,-7.6,5.6,3.2,vacuumGradient(c,-7.6,-4.4,['#e9eef1','#9aa4ab','#c9d0d5']),1);
  polygon(c,[[-9.5,-5],[9.5,-5],[11,-4],[11.6,-1],[14,2.6],[14.4,4],[-14.4,4],[-14,2.6],[-11.6,-1],[-11,-4]],
    vacuumGradient(c,-5,4,['#f4f7f9','#c3cbd1','#6f7a83','#d6dde2','#98a2aa']));
  vacuumBox(c,-8,-1.6,16,2.2,'#2b3238',.8);
  for(let x=-11.5;x<=11.5;x+=3.83)vacuumOval(c,x,4.6,.8,.8,'#e3e8eb');
  for(let x=-13;x<=13;x+=2.17)vacuumLine(c,x,5.1,x,6.6,'#5a5b55',.6);
  vacuumLine(c,-7.5,-4.1,7.5,-4.1,'#ffffff',.6);
}


// THE BRUSH IS WORKED LIKE A PERSON VACUUMING, side to side (Peter, 20 Oct 2026: "go
// right some distance and then as the body moves past it drags it along... a slow and
// deliberate vacuuming action"). Each stroke the head is lifted a touch and pushed out
// ahead, set down, and then hauled back behind as the cleaner travels on, slower than the
// floor so it reads as dragged. Drawing only — the pickup point the litter is timed
// against (vacuumBrushPose) stays fixed, so nothing on the rail un-collects as it swings;
// the litter flies to where the head is drawn. Returns { dx, lift, tilt } in rail units.
// Peter, same day: "bigger motion, and have the brush head go a bit to the right of the
// body" — the rest point is 35 behind the body's centre, so REACH 72 puts the head just
// past the casing's right side and TRAIL 22 well behind. `reach` caps the push where the
// screen ends (portrait parks the cleaner at the right edge).
const STROKE = 2.2, PUSH = .32, REACH = 72, TRAIL = -22;
export function vacuumBrushScrub(time, active = true, reach = REACH) {
  if(!active) return { dx: 0, lift: 0, tilt: 0 };
  const REACH_=Math.max(TRAIL+20,Math.min(REACH,reach));
  const u=((time/STROKE)%1+1)%1;
  if(u<PUSH) {
    const p=smooth(u/PUSH);
    return { dx: mix(TRAIL,REACH_,p), lift: 2.4*Math.sin(Math.PI*u/PUSH), tilt: -.08*Math.sin(Math.PI*u/PUSH) };
  }
  const v=(u-PUSH)/(1-PUSH);
  // It catches the floor and gives, then comes along steadily behind.
  const drag=v<.12 ? .5*v/.12*v : .06+.94*(v-.12)/.88;
  return { dx: mix(REACH_,TRAIL,unit(drag)), lift: 0, tilt: .05*(1-v) };
}
export function vacuumBrushPose({ x, y, corridor, attack }) {
  const sourceLane=attack?.sourceLane ?? 1, railY=sourceLane ? -corridor : 0;
  // The room moves under one fixed pickup point. Only a gravity turn retracts
  // the head; chewing and ejecting do not make it hunt across the surface.
  return { x:x-35, y:railY+(sourceLane?3.7:-3.7), railY, sourceLane };
}

// Body designs plug into one common brush / hose / compaction / discharge rig.
// A cube is a visual warning while descending; its existing rail collider starts
// at release, exactly where the blast ends. No hidden mid-air collision.
export function drawVacuumAssembly(c, { x, y, corridor, attack, time=0, lane=0, flip=null, flipPrep=0,
  drawBody=drawVacuumMawBody, drawHose=drawVacuumSpiralHose,
  drawBrush=drawVacuumSpiralHead, reducedMotion=false, intake=null, rightEdge=Infinity }) {
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
  const recoil=phase==='telegraph' && !reducedMotion
    ? 2.2*Math.sin(Math.PI*unit((progress-.2)/.26)) : 0;
  const targetSign=attack?.lane ? -1 : 1, targetY=attack?.lane ? -corridor+7.5 : -7.5;
  c.save();c.lineCap='round';c.lineJoin='round';
  // The free hose has a gentle hanging loop; its endpoints remain attached.
  const brushSign=brush.sourceLane?-1:1;
  const head=local(0,-24-recoil), parkedBrush=local(0,-40);
  const working=phase==='suction'||phase==='sweep';
  // The stroke never stops, chewing and firing included: switched off with the phase it
  // jumped the head home in a frame (Peter: "the brush head snaps from right to left").
  // Only a gravity turn parks it, and that eases (retract). The head is 16 either side of
  // its centre: keep the whole of it on screen.
  const stroke=reducedMotion ? vacuumBrushScrub(0,false) : vacuumBrushScrub(time,true,rightEdge-16-brush.x);
  const away=brush.sourceLane ? 1 : -1, hold=1-retract;
  let brushX=mix(brush.x+stroke.dx*hold,parkedBrush[0],retract);
  let brushY=mix(brush.y+away*stroke.lift*hold,parkedBrush[1],retract);
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
  const headControl=local(0,-56-recoil), parkedControl=local(0,-31), tailControl=local(0,-35);
  const pts=[head,
    [mix(headControl[0],parkedControl[0],retract),mix(headControl[1],parkedControl[1],retract)],
    // The last stretch comes straight down into the head's collar, square to it.
    [mix(brushX-(BRUSH_NECK-14)*Math.sin(brushAngle),tailControl[0],retract),
      mix(brushY+(BRUSH_NECK-14)*Math.cos(brushAngle),tailControl[1],retract)],
    [brushX-BRUSH_NECK*Math.sin(brushAngle),brushY+BRUSH_NECK*Math.cos(brushAngle)]];
  drawHose(c,pts,reducedMotion?0:time,phase==='suction'||phase==='sweep');
  c.save();c.translate(brushX,brushY);c.rotate(brushAngle+stroke.tilt*hold*away);
  drawBrush(c,{time:reducedMotion?0:time,active:working});
  c.restore();
  c.save();c.translate(x,y);c.rotate(angle);c.translate(0,-recoil);
  // Seat the narrow socket behind the casing so its lower edge is hidden by
  // the face outline instead of crossing it.
  vacuumBox(c,-3.5,-24,7,5,'#75617e',1.3);
  // The outlet uses the same tucked mount below the casing. Its top edge is
  // covered by the body rather than painted over the lower face outline.
  vacuumBox(c,-8.5,19,17,5,phase==='telegraph'?'#e9b64d':'#75617e',1);
  drawBody(c,{phase,progress,time:reducedMotion?0:time,targetSign,count:attack?.count||1,intake,
    cubeVariant:garbageCubeVariant(attack?.at,0),reducedMotion});
  c.restore();
  if(phase==='telegraph') {
    const flight=unit((progress-.2)/.8);
    // A hard launch, short cruise and fast arrival read as a blast, while the
    // cube still lands at its existing rail position with no horizontal speed.
    const travel=flight+.8*flight*(1-flight)*(1-2*flight);
    const outlet=local(0,30-recoil);
    const cubeX=x, cubeY=mix(outlet[1],targetY,travel);
    if(progress>=.2) {
      if(!reducedMotion) {
        const blast=1-smooth(flight/.34);
        if(blast>0) {
          c.save();c.translate(...outlet);c.scale(1,targetSign);c.globalAlpha=blast;
          polygon(c,[[-7,0],[7,0],[10,6],[5,4],[0,13],[-5,4],[-10,6]],'#f8e2a6',.35);
          vacuumLine(c,-10,2,-15,8,'#f3ba67',1.6);
          vacuumLine(c,10,2,15,8,'#f3ba67',1.6);
          c.restore();
        }
        const streak=unit(flight/.08)*(1-smooth((flight-.78)/.22));
        if(streak>0) {
          c.save();c.globalAlpha=.8*streak;
          for(const side of [-1,1]) {
            vacuumLine(c,cubeX+side*8,cubeY-targetSign*18,
              cubeX+side*10,cubeY-targetSign*11,'#e9aa64',1.2);
          }
          c.restore();
        }
      }
      c.save();c.translate(cubeX,cubeY);c.scale(1,targetSign);
      for(let i=0;i<(attack.count||1);i++)
        drawGarbageCube(c,i*24*travel,0,1.5,garbageCubeVariant(attack?.at,i));
      c.restore();
    }
  }
  c.restore();
}
