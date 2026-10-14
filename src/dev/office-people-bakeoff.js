import { studyHead, studyBackHead } from '../engine/stylePacks/officeLigne/peopleHeads.js';
import { lunchPeople } from '../engine/stylePacks/officeLigne/lunchPeople.js';
// Gallery-only people studies, using the office's native line and colour vocabulary.
import { box, rbox, poly, line, circ, ell, PAL } from '../engine/stylePacks/officeLigne/line.js';
import { head } from '../engine/stylePacks/officeLigne/room.js';
import { MID_BASE } from '../engine/stylePacks/officeClimb.js';
import { bite, pedestalTable, eggLunch, cake } from '../engine/stylePacks/officeLigne/diners.js';
import { drawDinerRoom } from './office-diner-candidates.js';
const ink=PAL.open.inkM;
export const HAIR_STUDIES=[
 {id:'current',name:'BEFORE — Current hair',note:'Existing short hairstyle, for direct comparison at the same size.'},
 {id:'part',name:'A — Soft side part',note:'An asymmetric hairline and a clean temple; no floating cap.'},
 {id:'crop',name:'B — Textured crop',note:'A short, broken fringe with a close cut at the sides.'},
 {id:'bob',name:'C — Rounded bob',note:'A shaped jaw-length silhouette, tucked behind one ear.'},
 {id:'curls',name:'D — Compact curls',note:'A coherent rounded mass with a few readable curl breaks.'},
 {id:'sweep',name:'E — Swept back',note:'A small lifted forelock and a tapered nape.'},
 {id:'bun',name:'F — Low bun',note:'A low, compact bun and a visible parting, without oversized round lobes.'},
];
export function drawHairStudy(g,id){
 box(g,0,0,480,210,'#e8e2ee');box(g,0,151,480,59,'#a9c6c4');
 const colors=[['#edc49e','#584033'],['#aa7255','#292730'],['#f1d2b5','#967353']];
 for(let i=0;i<3;i++){
  const x=85+i*150;poly(g,[x-32,140,x-29,104,x-11,93,x+12,93,x+30,104,x+33,140],['#789b9e','#b587a6','#d7b86f'][i],ink,1);
  box(g,x-5,85,10,13,colors[i][0],ink,.7);
  studyBackHead(g,x,68,27,id,...colors[i]);
 }
 // Back-of-head view at monitors, at actual office-NPC scale.
 for(let i=0;i<7;i++){
  const x=50+i*62;
  box(g,x+7,167,14,11,'#637e80',ink,.4);box(g,x+9,169,10,7,'#b5d4bd');line(g,x+14,178,x+14,181,ink,.7);
  box(g,x-16,181,39,3,'#d6b99b',ink,.4);
  box(g,x-4.5,179,9,14,['#789b9e','#b587a6','#d7b86f'][i%3],ink,.4);
  studyBackHead(g,x,174,5,id,...colors[i%3]);
  rbox(g,x-6,183,12,15,1.8,'#777080',ink,.4);
 }

}
export const LUNCH_STUDIES=[
 {id:'selected',name:'SELECTED — New people, original booth',note:'The new seated people with the existing upholstered booth and table.',paint:(g,d,f,P)=>lunchPeople(g,d,f,P,'selected')},
 {id:'chairs',name:'A — Clear seated silhouettes',note:'Separate chairs, horizontal thighs, grounded feet and a slow spoonful.',paint:(g,d,f,P)=>lunchPeople(g,d,f,P,'chairs')},
 {id:'booth',name:'B — Softer booth seating',note:'Lower booth sides keep the lap and elbow visible; two diners eat out of step.',paint:(g,d,f,P)=>lunchPeople(g,d,f,P,'booth')},
 {id:'compact',name:'C — Sandwich break',note:'A closer table, small sandwich bites and less exaggerated reach.',paint:(g,d,f,P)=>lunchPeople(g,d,f,P,'compact')},
];
export function drawLunchStudy(g,t,cand,detail=false){
 if(!detail){drawDinerRoom(g,t,cand,{floor:'open',kind:'canteen'});return;}
 box(g,0,0,480,240,'#e8e2ee');box(g,0,190,480,50,'#aaa2b7');
 g.save();g.translate(240,198);g.scale(3,3);g.translate(0,-MID_BASE);cand.paint(g,{room:'canteen',span:[-64,64],seed:30},{t},PAL.open);g.restore();
}
