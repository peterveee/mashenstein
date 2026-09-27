// The original Z1-Z3 zombie painters, now shared by the Crypt scenery and the lab.
// Authored at 118 units tall; callers position and scale them on the far ridge.
const INK = '#252334', BONE = '#ded9b5';
function shape(c, fill, path, width = 2) {
  c.beginPath(); path(c); c.fillStyle = fill; c.fill();
  if (width) { c.strokeStyle = INK; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(); }
}
function poly(c, fill, pts, width = 2) {
  shape(c, fill, p => { pts.forEach(([x,y], i) => i ? p.lineTo(x,y) : p.moveTo(x,y)); p.closePath(); }, width);
}
function oval(c, fill, x, y, rx, ry, width = 2) {
  shape(c, fill, p => p.ellipse(x,y,rx,ry,0,0,Math.PI*2), width);
}
function line(c, color, width, pts) {
  c.beginPath(); pts.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function limb(c, pts, color, width) {
  line(c, INK, width + 3, pts); line(c, color, width, pts);
}
function seams(c, x, y) {
  line(c, '#576758', 1.3, [[x,y],[x+8,y+3]]);
  for (let i=0;i<3;i++) line(c, '#d2d7a8', 1, [[x+1+i*3,y-1+i],[x+i*3,y+3+i]]);
}
function walkingLeg(c, hipX, phase, color, shoe) {
  const turn = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const p = turn / (Math.PI * 2);
  const stance = 0.58;
  let stride, lift = 0;
  if (p < stance) {
    // The foot rolls back under the body while planted, then pushes off.
    stride = -10 + 20 * (p / stance);
  } else {
    // Carry it forward with a knee lift; it lands at the front of the next step.
    const swing = (p - stance) / (1 - stance);
    stride = 10 - 20 * swing;
    lift = 10 * Math.sin(Math.PI * swing);
  }
  const footX = hipX + stride;
  const footY = -5 - lift;
  const kneeX = hipX + stride * 0.52 + (hipX < 30 ? 2 : -2);
  const kneeY = -18 - lift * 0.42;
  limb(c, [[hipX,-34],[kneeX,kneeY],[footX,footY]], color, 7);
  oval(c, shoe, footX + 1, footY + 1, 10, 3.5);
}
function face(c, kind, t) {
  const skin = kind === 'clerk' ? '#a7b7ab' : kind === 'gardener' ? '#b5bd7d' : '#90a99b';
  oval(c, skin, 14, -76, 5, 7);
  poly(c, skin, [[17,-93],[34,-98],[49,-91],[51,-72],[42,-61],[22,-64],[14,-75]], 2.5);
  poly(c, '#657e77', [[42,-91],[49,-87],[50,-73],[42,-63],[32,-64],[37,-73]], 0);
  poly(c, '#c8d2ab', [[18,-88],[29,-93],[35,-91],[29,-83],[18,-80]], 0);
  oval(c, INK, 22,-80,6,5,0); oval(c, INK, 40,-79,5.5,4,0);
  oval(c, '#f1ba6e', 20,-80,2,2,0); oval(c, '#f1ba6e', 38,-79,1.8,2,0);
  line(c, '#d0dbb2', 2, [[16,-86],[26,-84]]);
  line(c, INK, 2.5, [[34,-85],[45,-87]]);
  poly(c, '#788e7b', [[29,-81],[25,-73],[33,-73]],1);
  const jaw = Math.sin(t*3)*1.2;
  poly(c, INK, [[20,-70],[40,-70],[37,-64+jaw],[23,-65+jaw]],0);
  for (let i=0;i<3;i++) poly(c,BONE,[[23+i*5,-70],[26+i*5,-70],[26+i*5,-67],[23+i*5,-67]],0);
  seams(c,35,-92);
  if (kind === 'clerk') {
    line(c, '#52505d', 2, [[14,-94],[24,-99],[39,-98],[48,-91]]);
    line(c, '#eee3ba', 1.4, [[15,-83],[28,-83],[28,-76],[16,-76],[15,-83]]);
    line(c, '#eee3ba', 1.4, [[34,-82],[46,-82],[46,-75],[34,-75],[34,-82]]);
    line(c, '#eee3ba', 1.2, [[28,-80],[34,-79]]);
  }
  if (kind === 'usher') {
    poly(c,'#393746',[[18,-95],[20,-111],[43,-112],[49,-95]],2);
    poly(c,'#716582',[[20,-99],[46,-100],[48,-95],[18,-94]],0);
    oval(c,'#393746',32,-94,24,4,2);
    line(c,'#a9a5b2',1.3,[[24,-108],[39,-109]]);
    poly(c,'#9eb886',[[44,-109],[49,-116],[50,-108],[55,-112],[52,-104]],0);
  }
  if (kind === 'gardener') {
    oval(c,'#6b7954',33,-94,23,6,2);
    shape(c,'#859362',p=>{p.moveTo(15,-96);p.quadraticCurveTo(14,-114,32,-111);p.quadraticCurveTo(48,-110,49,-96);p.closePath();});
    line(c,'#b8bf81',2,[[22,-104],[34,-106],[42,-102]]);
    oval(c,'#dba979',49,-107,7,3,1); line(c,BONE,2,[[47,-107],[45,-100]]);
  }
}
export function drawCryptBackgroundZombie(c,t,kind) {
  const ph=t*4, step=Math.sin(ph)*6, bob=Math.abs(Math.sin(ph))*1.2;
  const coat=kind==='usher'?'#51495f':kind==='gardener'?'#6c7954':'#687d8e';
  walkingLeg(c,37,ph+Math.PI,'#465151','#393941');
  walkingLeg(c,23,ph,'#687570','#34343c');
  c.save(); c.translate(-Math.sin(ph)*1.8,-bob); c.rotate(-.08 + Math.sin(ph)*.025);
  limb(c,[[42,-56],[54,-43],[48,-30+step*.2]],'#607965',7);
  poly(c,coat,[[18,-65],[39,-64],[46,-53],[47,-26],[38,-29],[35,-24],[28,-29],[23,-24],[15,-28],[14,-51]],2.5);
  poly(c,'#363d46',[[36,-61],[43,-52],[44,-29],[34,-30]],0);
  poly(c,kind==='clerk'?'#dad9bd':'#9eab94',[[23,-62],[34,-62],[30,-41]],1);
  poly(c,coat,[[17,-61],[24,-62],[27,-44],[19,-50],[22,-55]],1);
  poly(c,coat,[[35,-62],[40,-57],[35,-51],[36,-46],[30,-42]],1);
  poly(c,kind==='clerk'?'#b77e70':'#b0a583',[[27,-60],[31,-59],[29,-53],[33,-40],[29,-35],[26,-42]],1);
  line(c,'#9da99a',1,[[18,-49],[17,-33],[23,-35]]);
  for(let i=0;i<3;i++) oval(c,'#c7baa0',32,-44+i*6,1.2,1.2,0);
  // A forward-reaching elbow and separate dangling wrist replace whole-sprite rocking.
  limb(c,[[18,-56],[8,-46+step*.15],[-4,-52+step*.2]],coat,8);
  limb(c,[[-4,-52+step*.2],[-13,-51+step*.25]],'#a2b791',5);
  for(let i=0;i<3;i++) line(c,'#bcc5a0',1.8,[[-13,-53+i*2+step*.25],[-18-i%2*2,-51+i*2+step*.25]]);
  if(kind==='clerk') {
    poly(c,'#e2d8b4',[[37,-51],[45,-51],[45,-43],[37,-43]],.8);
    line(c,'#8c6770',1.5,[[39,-48],[43,-48]]);
    poly(c,'#927960',[[45,-36],[58,-36],[59,-18],[44,-19]],2);
    line(c,'#d0b485',1,[[47,-32],[54,-32],[54,-23]]);
  }
  if(kind==='gardener') {
    poly(c,'#9b876a',[[19,-48],[39,-47],[41,-28],[17,-29]],1.5);
    poly(c,'#615b4d',[[22,-40],[34,-40],[33,-33],[23,-33]],1);
    for(let i=0;i<4;i++) oval(c,'#c1b18c',21+i*5,-30-i%2*8,1.4,2,0);
    line(c,'#987d60',3,[[51,-47],[54,-6]]);
    poly(c,'#afb5a3',[[49,-15],[58,-16],[60,-5],[55,0],[50,-4]],1.5);
  }
  if(kind==='usher') {
    line(c,'#a89b74',1.5,[[45,-30],[51,-35],[57,-30]]);
    poly(c,'#66665c',[[44,-30],[59,-30],[61,-14],[43,-14]],2);
    poly(c,'#edd59b',[[47,-27],[55,-27],[57,-17],[47,-17]],0);
    line(c,'#697063',1.5,[[51,-29],[51,-15]]);
    oval(c,'#fff1bb',51,-21,2,3+Math.sin(t*7),0);
  }
  c.save(); c.translate(-3,0); c.rotate(Math.sin(ph-.5)*.035); face(c,kind,t); c.restore();
  c.restore();
}
