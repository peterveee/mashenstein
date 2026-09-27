// Crypt animal auditions: review only. Paint directly in the lane's flat toon
// language at authored detail above the gallery's supersampling threshold.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../game/draw.js';
import { makeObstacle } from '../game/entities.js';
import { CRYPT_ENEMY_CANDIDATES } from './crypt-enemy-candidates.js';

import { paintCryptAnimal } from '../sprites/crypt-animals.js';

export const CRYPT_ANIMAL_STUDIES=[
 {id:'H0',name:'Current bone hound',kind:'refBone',note:'First pass: the small skeletal dog you liked; reference.',w:24,h:15},
 {id:'H1',name:'Moonbone',kind:'moon',note:'Readable ribcage, long skull and a quiet pale edge; gaunt but still a lane character.',w:26,h:21},
 {id:'H2',name:'Ivory Runner',kind:'ivory',note:'Lower, longer greyhound silhouette with an open ribcage and laid-back ear.',w:32,h:18},
 {id:'H3',name:'Gravehound',kind:'grave',note:'Dark fur silhouette with a skull mask and bone plates; strongest Crypt mood.',w:27,h:22},
 {id:'D0',name:'Current feral dog',kind:'refDog',note:'Shipped Crypt dog for comparison.',w:25,h:20},
 {id:'D1',name:'Lean Feral',kind:'feral',note:'Focused wolf-dog silhouette, gaunt ribs and restrained hackles.',w:27,h:20},
 {id:'D2',name:'Grave Warden',kind:'warden',note:'Broad guard dog, clear face, heavy paws and funeral brass collar.',w:26,h:21},
 {id:'D3',name:'Shade Dog',kind:'shade',note:'Sleek violet runner with warm eyes and a long clean muzzle.',w:27,h:20},
 {id:'C0',name:'Current furious cat',kind:'refCat',note:'Shipped Crypt cat for comparison.',w:18,h:17},
 {id:'C1',name:'Cemetery Cat',kind:'cat',note:'Arched back and expressive head with soft mauve tabby marks.',w:21,h:19},
 {id:'C2',name:'Panther',kind:'panther',note:'Low stalking back, long tail and a pale edge readable on the dark lane.',w:27,h:20},
 {id:'C3',name:'Violet Panther',kind:'violet',note:'More stylised and expressive; stronger silhouette and pale violet rim.',w:27,h:20},
];
let pack,cab;
const refs={refDog:makeObstacle('dogFeral',0),refCat:makeObstacle('catFury',0)};
function drawCandidate(c,t,item,x,ground){
 if(item.kind==='refDog'||item.kind==='refCat'){
  const e=refs[item.kind];e.x=x-e.w/2;e.gait=t*8;
  c.save();if(ground===0)c.translate(0,-GROUND_Y);
  drawWorldEntity(c,e,0,t,pack,{});c.restore();return;
 }
 if(item.kind==='refBone'){
  c.save();c.translate(x,ground);c.scale(item.h/70,item.h/70);c.translate(-43,0);
  CRYPT_ENEMY_CANDIDATES.find(v=>v.id==='E2').paint(c,t);c.restore();return;
 }
 c.save();c.translate(x-item.w/2,ground-item.h);c.scale(item.w/100,item.h/70);
 paintCryptAnimal(c,t,item.kind);
 c.restore();
}
const pose=t=>({kind:'run',phase:(t*1.6)%1,time:t,vy:0,grounded:true,squash:0,lean:0,facing:1});
export function drawCryptAnimalStudy(c,t,item,close=false){
 if(!pack){cab=CABINETS.find(x=>x.id==='crypt');pack=getStylePack(cab.style,{});}
 if(close){
  c.fillStyle='#303745';c.fillRect(0,0,480,270);c.fillStyle='#3c4452';c.fillRect(0,225,480,45);
  c.save();c.translate(65,225);c.scale(4,4);drawToon(c,'lorenzo',pose(t),0,0,HERO_DRAW_H);c.restore();
  c.save();c.translate(240,225);c.scale(4.7,4.7);drawCandidate(c,t,item,0,0);c.restore();
  c.save();c.translate(410,225);c.scale(4,4);drawToon(c,'gary',pose(t),0,0,HERO_DRAW_H);c.restore();
  c.fillStyle='#e3e2dc';c.textAlign='center';c.font='10px monospace';
  c.fillText('LORENZO',65,253);c.fillText(item.id+' '+item.name.toUpperCase(),240,253);c.fillText('GARY',410,253);c.textAlign='left';return;
 }
 const camX=900+t*30;
 c.save();pack.bg(c,t,camX,cab,1000,null,0,{stageIndex:1});
 c.save();applyWorld(c,ZOOM,0,GROUND_Y);pack.ground(c,camX,cab,[],[],t*60,VIEW_W);
 drawToon(c,'lorenzo',pose(t),45,GROUND_Y,HERO_DRAW_H);
 drawCandidate(c,t,item,148,GROUND_Y);
 drawToon(c,'gary',pose(t),205,GROUND_Y,HERO_DRAW_H);
 c.restore();c.restore();
}
