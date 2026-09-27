// First-round enemy/obstacle studies. Z1-Z3 now also paint distant scenery;
// no entity definitions or spawn tables are changed by these candidates.
// Authored in a 100-unit coordinate system, rasterized by the gallery supersampling.
// Zombie studies share the shipped 10x14 logical envelope and 13x19 visual envelope.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../game/draw.js';
import { makeObstacle } from '../game/entities.js';
import { PLAYER_X } from '../game/player.js';
import { drawCryptBackgroundZombie } from '../sprites/crypt-background-zombies.js';

const INK = '#252334', BONE = '#ded9b5', LIGHT = '#eff0c9';
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
function coffin(c,t) {
  const s=Math.sin(t*4)*5;
  limb(c,[[19,-25],[4,-20],[-9,-4]],'#a7b39a',7);
  limb(c,[[72,-25],[91,-20],[100,-4]],'#92a487',7);
  for(const x of [-9,100]) for(let i=0;i<3;i++) line(c,BONE,2,[[x,-5],[x-6+i*4,0]]);
  poly(c,'#745a5c',[[12,-47],[27,-65],[65,-65],[82,-48],[70,-5],[26,-5]],3);
  poly(c,'#302e3b',[[20,-44],[30,-57],[61,-57],[73,-44],[63,-13],[33,-13]],2);
  oval(c,'#a8b79c',46,-38,15,17,2);
  oval(c,INK,39,-42,4,4,0); oval(c,INK,53,-42,4,4,0);
  line(c,'#f5c981',2,[[37,-42],[40,-42]]); line(c,'#f5c981',2,[[51,-42],[54,-42]]);
  line(c,INK,3,[[39,-28],[52,-27]]);
  c.save();c.translate(71,-6);c.rotate(.65+s*.014);
  poly(c,'#a47d76',[[-43,-2],[-54,-41],[-39,-58],[-7,-58],[9,-42],[-1,-2]],2.5);
  line(c,'#d1a993',2,[[-45,-40],[-34,-50],[-13,-50],[0,-39],[-7,-10]]);
  line(c,'#c5b98e',5,[[-24,-44],[-24,-21]]); line(c,'#c5b98e',5,[[-33,-36],[-15,-36]]);
  c.restore();
}
function hound(c,t) {
  const a=Math.sin(t*7)*9;
  limb(c,[[18,-28],[9+a,-15],[4-a,0]],'#b8b999',5);
  limb(c,[[63,-27],[70-a,-13],[80+a,0]],'#b8b999',5);
  shape(c,'#687b71',p=>{p.moveTo(13,-40);p.bezierCurveTo(25,-51,54,-51,71,-37);p.lineTo(68,-24);p.quadraticCurveTo(35,-15,13,-26);p.closePath();},2.5);
  for(let i=0;i<5;i++) line(c,BONE,3,[[23+i*7,-42],[22+i*7,-33],[27+i*7,-25]]);
  limb(c,[[25,-29],[28-a,-12],[19+a,0]],BONE,5);
  limb(c,[[60,-28],[57+a,-14],[49-a,0]],BONE,5);
  line(c,'#b1b5a0',4,[[69,-36],[86,-43],[92,-56+Math.sin(t*5)*4]]);
  poly(c,BONE,[[5,-55],[20,-52],[24,-39],[14,-30],[-4,-31],[-9,-39]],2.5);
  poly(c,'#789186',[[7,-50],[3,-67],[16,-54]],2);
  oval(c,INK,6,-43,5,5,0);oval(c,'#eaa772',4,-43,2,2,0);
  oval(c,INK,-5,-35,3,2,0);
  for(let i=0;i<3;i++) poly(c,LIGHT,[[i*5-3,-30],[i*5+1,-30],[i*5-1,-25]],.7);
  line(c,'#9a7684',4,[[17,-31],[22,-29]]);
}
function moth(c,t) {
  const flap=.55+.45*Math.sin(t*6)**2;
  c.save();c.scale(1,flap);
  for(const sign of [-1,1]) {
    c.save();c.scale(sign,1);
    shape(c,'#a89aba',p=>{p.moveTo(0,-18);p.bezierCurveTo(20,-49,53,-58,57,-39);p.bezierCurveTo(64,-22,42,-14,42,3);p.lineTo(30,-2);p.lineTo(28,11);p.lineTo(15,3);p.lineTo(11,15);p.lineTo(0,-7);p.closePath();},2.5);
    shape(c,'#6c5c82',p=>{p.moveTo(7,-16);p.quadraticCurveTo(33,-45,51,-43);p.lineTo(44,-24);p.lineTo(32,-11);p.lineTo(20,-6);p.closePath();},0);
    oval(c,'#d3bd97',32,-27,10,8,1);oval(c,INK,32,-27,6,5,0);oval(c,'#ba837a',30,-28,2,3,0);
    line(c,'#ddc9b0',1.6,[[8,-15],[23,-17],[41,-36]]);
    for(let i=0;i<6;i++) oval(c,'#d4c6b0',12+i*5,2-i*3,1,1,0);
    c.restore();
  }
  c.restore();
  oval(c,'#62556b',0,-13,7,20,2);oval(c,BONE,0,-28,7,8,2);
  oval(c,INK,-3,-29,2,3,0);oval(c,INK,3,-29,2,3,0);
  line(c,'#d3c4a6',1.5,[[-3,-34],[-9,-44],[-15,-44]]);
  line(c,'#d3c4a6',1.5,[[3,-34],[9,-44],[15,-44]]);
  for(let i=0;i<3;i++) line(c,'#9c899d',2,[[-5,-18+i*7],[5,-18+i*7]]);
}
function stone(c,t) {
  const y=Math.sin(t*3)*1.5;
  poly(c,'#687b7b',[[6,0],[0,-9],[8,-12],[9,-69],[20,-83],[43,-85],[59,-70],[58,-12],[68,-8],[65,0]],3);
  poly(c,'#abb6a0',[[10,-68],[21,-79],[41,-81],[54,-68],[51,-17],[13,-17]],1.5);
  poly(c,'#849789',[[42,-79],[54,-68],[51,-17],[38,-17]],0);
  line(c,'#d5d6b4',2,[[15,-67],[24,-74],[37,-75]]);
  poly(c,INK,[[17,-57],[29,-52],[25,-45],[17,-47]],0);
  poly(c,INK,[[37,-52],[48,-57],[47,-47],[38,-45]],0);
  line(c,'#dfb47b',2,[[20,-50],[25,-49]]);line(c,'#dfb47b',2,[[40,-49],[45,-50]]);
  shape(c,INK,p=>{p.moveTo(20,-33);p.quadraticCurveTo(32,-42-y,45,-33);p.lineTo(43,-23+y);p.lineTo(21,-23+y);p.closePath();},0);
  for(let i=0;i<4;i++) poly(c,BONE,[[23+i*5,-34],[26+i*5,-34],[25+i*5,-29]],0);
  line(c,'#62706e',1.5,[[31,-79],[28,-69],[35,-63],[31,-57]]);
  for(let i=0;i<7;i++) oval(c,i%2?'#91a271':'#647b59',9+i*7,-9-i%3*2,4,3,0);
  limb(c,[[10,-15],[-4,-11],[-10,-2]],'#889b81',5);
  limb(c,[[55,-15],[69,-11],[77,-2]],'#889b81',5);
}

export const CRYPT_ENEMY_CANDIDATES = [
  {id:'Z0',name:'Current zombie',note:'Production control: the existing sprite and rocking gait.',base:true,w:13,h:19},
  {id:'Z1',name:'The Last Usher',note:'Crooked top hat, split mourning coat, stiff knee and swinging funeral lantern. Jump / ability; existing zombie footprint.',kind:'usher',w:13,h:19},
  {id:'Z2',name:'Graveyard Gardener',note:'Mossy work hat, stitched cheek, soil apron and dragging spade. Jump / ability; existing zombie footprint.',kind:'gardener',w:13,h:19},
  {id:'Z3',name:'Overtime Clerk',note:'Broken spectacles, slack jaw, flapping tie, staff pass and funeral paperwork. Jump / ability; existing zombie footprint.',kind:'clerk',w:13,h:19},
  {id:'E1',name:'Coffin Crawler',note:'A dead employee carries the coffin from inside. Lid rattles; hands pull the low silhouette forward. Proposed low jump / ability hazard.',paint:coffin,w:23,h:15,authorH:70,center:45},
  {id:'E2',name:'Bone Hound',note:'Moon-pale rib cage, exposed joints, drooping ear and coal eyes. Proposed ground runner; jump / ability, no surprise leap.',paint:hound,w:24,h:15,authorH:70,center:43},
  {id:'E3',name:'Funeral Moth',note:'Dusty mourning wings, skull thorax and eye spots. Proposed fixed-height flyer to slide under; no tracking or sudden dive.',paint:moth,w:27,h:17,authorH:65,center:0,air:22},
  {id:'O1',name:'Hungry Headstone',note:'Cracked carved face, moss shoulders and root fingers. Proposed stationary jump / break obstacle; expression moves, collision stays still.',paint:stone,w:19,h:21,authorH:87,center:33},
];
let pack, cab;
const baseline=makeObstacle('zombie',148);
function drawCandidate(c,t,item) {
  if(item.base) { baseline.x=148;baseline.gait=t*4;drawWorldEntity(c,baseline,0,t,pack,{});return; }
  c.save();c.translate(153,GROUND_Y-(item.air||0));
  // Exactly the existing zombie's drawn height; hats and limbs are included.
  const scale=item.h/(item.authorH||118);c.scale(scale,scale);c.translate(-(item.center??24),0);
  if(item.kind) drawCryptBackgroundZombie(c,t,item.kind);else item.paint(c,t);
  c.restore();
}
export function drawCryptEnemyStudy(c,t,item,close=false) {
  if(!pack){cab=CABINETS.find(x=>x.id==='crypt');pack=getStylePack(cab.style,{});}
  c.save();
  if(close){c.translate(240,244);c.scale(4,4);c.translate(-153*ZOOM,-GROUND_Y+(item.air||0)*ZOOM);}
  const camX=900+t*30;
  pack.bg(c,t,camX,cab,1000,null,0,{stageIndex:1});
  c.save();applyWorld(c,ZOOM,0,GROUND_Y);
  pack.ground(c,camX,cab,[],[],t*60,VIEW_W);
  if(!close) drawToon(c,'lorenzo',{kind:'run',phase:t*1.6%1,time:t,vy:0,grounded:true,squash:0,lean:0,facing:1},PLAYER_X,GROUND_Y,HERO_DRAW_H);
  drawCandidate(c,t,item);
  c.restore();c.restore();
}

// Original studies remain available as controls in the second, lane-style bakeoff.
export { drawCryptBackgroundZombie as drawOriginalCryptZombie, stone as drawOriginalCryptHeadstone };
