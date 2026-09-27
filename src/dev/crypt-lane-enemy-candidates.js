// Lane-first second round. All art is review-only: no collision or spawn edits.
// 28u zombie art height versus round one's 19u. Shapes authored at >100 units,
// then drawn through the gallery's supersampled canvas at the final world size.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawOriginalCryptZombie, drawOriginalCryptHeadstone } from './crypt-enemy-candidates.js';

import { CRYPT_ART_STYLES as CRYPT_LANE_STYLES, drawCryptZombie as zombie, drawCryptHeadstone as headstone, drawSelectedCryptEnemy } from '../sprites/crypt-enemies.js';
export { CRYPT_LANE_STYLES };
const roles=[['1','usher','Last Usher'],['2','gardener','Graveyard Gardener'],['3','clerk','Overtime Clerk'],['H','stone','Headstone']];
export const CRYPT_LANE_CANDIDATES=CRYPT_LANE_STYLES.flatMap(style=>roles.map(([suffix,role,name])=>({id:style.id+suffix,role,name,style,h:role==='stone'?23:28})));
const pose=t=>({kind:'run',phase:(t*1.6)%1,time:t,vy:0,grounded:true,squash:0,lean:0,facing:1});
function render(c,t,item,x,y){
 if(item.selected){drawSelectedCryptEnemy(c,t,item.role,x,y);return;}
 c.save();c.translate(x,y);
 if(item.original){
  const k=item.role==='stone'?21/87:19/118;c.scale(k,k);c.translate(item.role==='stone'?-33:-24,0);
  if(item.role==='stone')drawOriginalCryptHeadstone(c,t);else drawOriginalCryptZombie(c,t,item.role);
 }else{
  const height=item.role==='stone'?92:item.role==='clerk'?116:129;
  const k=item.h/height;c.scale(k*(item.style.id==='B' && item.role!=='stone'?1.16:1),k);c.translate(item.role==='stone'?-34:-24,0);
  if(item.role==='stone')headstone(c,t,item.style);else zombie(c,t,item.role,item.style);
 }
 c.restore();
}
let pack,cab;
const originals=roles.map(([id,role,name])=>({id,role,name,original:true}));
export function drawCryptLaneStudy(c,t,item,close=false){
 if(!pack){cab=CABINETS.find(x=>x.id==='crypt');pack=getStylePack(cab.style,{});}
 if(close){
  c.fillStyle='#303745';c.fillRect(0,0,480,270);
  c.fillStyle='#3c4452';c.fillRect(0,232,480,38);
  c.strokeStyle='#657080';c.lineWidth=.7;c.beginPath();c.moveTo(12,232);c.lineTo(468,232);c.stroke();
  if(!item){
   originals.forEach((v,i)=>{c.save();c.translate(65+i*115,232);c.scale(6,6);render(c,t,v,0,0);c.restore();});
  }else{
   c.save();c.translate(82,232);c.scale(6,6);drawToon(c,'lorenzo',pose(t),0,0,HERO_DRAW_H);c.restore();
   c.save();c.translate(229,232);c.scale(6,6);render(c,t,item,0,0);c.restore();
   c.save();c.translate(393,232);c.scale(6,6);drawToon(c,'gary',pose(t),0,0,HERO_DRAW_H);c.restore();
  }
  c.fillStyle='#e3e2dc';c.font='10px monospace';c.textAlign='center';
  if(!item)originals.forEach((v,i)=>c.fillText(v.role==='stone'?'O1 original':'Z'+v.id+' original',65+i*115,255));
  else{c.fillText('LORENZO · shipped',82,255);c.fillText(item.id+' · candidate',229,255);c.fillText('GARY · shipped',393,255);}
  c.textAlign='left';return;
 }
 const camX=900+t*30;
 c.save();pack.bg(c,t,camX,cab,1000,null,0,{stageIndex:1});
 c.save();applyWorld(c,ZOOM,0,GROUND_Y);pack.ground(c,camX,cab,[],[],t*60,VIEW_W);
 drawToon(c,'lorenzo',pose(t),45,GROUND_Y,HERO_DRAW_H);
 if(!item)originals.forEach((v,i)=>render(c,t,v,90+i*39,GROUND_Y));
 else{render(c,t,item,148,GROUND_Y);drawToon(c,'gary',pose(t),205,GROUND_Y,HERO_DRAW_H);}
 c.restore();c.restore();
}

export const CRYPT_SELECTED_CANDIDATES=roles.map(([suffix,role,name])=>({id:role==='stone'?'BH-live':'A'+suffix+'-live',role,name,selected:true}));
