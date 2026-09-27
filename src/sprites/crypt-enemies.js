// Crypt foreground characters: selected A zombies and animated BH slab.
// Pure vector painters shared by production and retained gallery alternatives.
export const CRYPT_ART_STYLES = [
 {id:'A',name:'Soft cast cartoon',note:'Round cheeks, thick hands and shoes, soft contours and bright flat colour. Closest to the playable cast.',ink:'rgba(26,16,40,.32)',edge:1.8,skin:'#a9d777',shade:'#78b457',stone:'#b9b8d4',stoneShade:'#8c8bad'},
 {id:'B',name:'Chunky cel',note:'Broad angular heads, large costume blocks and decisive two-tone shading. A more sculpted arcade enemy.',ink:'#3a354e',edge:2.1,skin:'#b5de75',shade:'#79b94e',stone:'#b3c4d9',stoneShade:'#748da9'},
 {id:'C',name:'Bold comic',note:'Bean-shaped faces, heavy clean ink, oversized eyes and elastic limbs. The most exaggerated option.',ink:'#352b48',edge:3.2,skin:'#c9e875',shade:'#9fc956',stone:'#d4c3e6',stoneShade:'#a08abb'},
];
function painter(c,s){
 const path=(fill,fn,w=s.edge)=>{c.beginPath();fn(c);c.fillStyle=fill;c.fill();if(w){c.strokeStyle=s.ink;c.lineWidth=w;c.lineJoin='round';c.stroke();}};
 const poly=(fill,points,w)=>path(fill,p=>{points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();},w);
 const oval=(fill,x,y,rx,ry,w)=>path(fill,p=>p.ellipse(x,y,rx,ry,0,0,Math.PI*2),w);
 const box=(fill,x,y,w,h,r=4,ow)=>path(fill,p=>p.roundRect(x,y,w,h,r),ow);
 const line=(fill,w,points)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=fill;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const limb=(fill,w,points)=>{line(s.ink,w+s.edge*1.4,points);line(fill,w,points);};
 return {path,poly,oval,box,line,limb};
}
export function drawCryptZombie(c,t,role,s,{vacant=false,idle=false,pace=1,phase=null}={}){
 const {path,poly,oval,box,line,limb}=painter(c,s), angular=s.id==='B', comic=s.id==='C';
 // THE SHAMBLE (Peter, 26 Sep 2026: "improve the movement of the zombies a little… they
 // seem a bit repetitive like flapping legs"). Not two legs swinging on one sine: the lead
 // leg steps — lifted, set down ahead — and the other drags, scuffing its toe along the
 // ground to catch up. The body lurches down as the weight lands on the lead foot, the
 // head lolls a beat behind, and the reaching arm bobs with the stride. Each role keeps
 // its own pace. Forward is -x (they face left, toward the hero).
 // `pace` quickens the legs for a zombie moving faster (a bolter); an `idle` one keeps
 // its feet planted while it breathes, shifts its weight, lolls its head, and lets its
 // reaching arm and held prop drift with the sway.
 const rate=(role==='usher'?0.62:role==='gardener'?0.74:0.68)*Math.max(0.6,Math.min(3,pace));
 // Live zombies carry an integrated phase. Multiplying absolute film time by a
 // changing flee speed skipped poses as they accelerated, most visibly in the
 // head. Gallery studies still use film time when no phase is supplied.
 const u=idle?0.93:(((phase == null ? t*rate : phase)%1)+1)%1, ease=(v)=>v*v*(3-2*v);
 const idleRock=idle?Math.sin(t*1.1+0.45):0;
 const SW=0.42;                                   // the lead leg's swing
 const fF=u<SW?6-12*ease(u/SW):-6+12*((u-SW)/(1-SW));
 const lF=u<SW?Math.sin(Math.PI*u/SW)*5:0;
 const d0=0.5,d1=0.9;                             // the drag: a slow scuff forward
 const fB=u>=d0&&u<d1?5-10*ease((u-d0)/(d1-d0)):-5+10*(((u-d1+1)%1)/(1-(d1-d0)));
 const lB=u>=d0&&u<d1?Math.sin(Math.PI*(u-d0)/(d1-d0))*0.8:0;
 const land=u>=SW&&u<SW+0.3?Math.sin(Math.PI*(u-SW)/0.3):0;
 const dip=idle?0.8*Math.sin(t*2.0+1.1):1.8*land-0.3*lF;
 const sway=idle?1.8*idleRock:Math.sin(u*Math.PI*2-.5);
 const step=Math.sin(u*Math.PI*2);
 const armBob=idle?2.6*Math.sin(t*1.7+0.8):1.6*land+1.2*Math.sin(u*Math.PI*2+1);
 const loll=idle?0.15*Math.sin(t*0.85+0.35):0.07*Math.sin((u-0.2)*Math.PI*2);
 const cloth=role==='usher'?'#8964af':role==='gardener'?'#e0a343':'#4797c3';
 const dark=role==='usher'?'#5d3d87':role==='gardener'?'#aa7333':'#326594';
 const shoes=role==='gardener'?'#765033':'#554061';
 // Drag leg behind, lead leg in front; the soles meet the ground unless lifted.
 limb(dark,angular?12:10,[[35,-36],[39+fB*0.55,-19-lB],[39+fB,-6-lB]]);
 c.save();c.translate(30+fB+12,-9-lB+9);c.rotate(-0.12*lB);box(shoes,-12,-9,24,9,comic?6:4);c.restore();
 limb(cloth,angular?13:11,[[17,-36],[13+fF*0.35,-18-lF*0.6],[13+fF,-6-lF]]);
 box(shoes,-1+fF,-9-lF,26,9,comic?6:4);
 line('#c5b5d0',1.5,[[3+fF,-3-lF],[19+fF,-3-lF]]);
 c.save();c.translate(sway*1.2-land*1.2,dip);
 if(idle)c.rotate(0.045*idleRock);
 limb(dark,11,[[42,-61],[52,-49],[51,-34]]);
 oval(s.shade,51,-32,6,7);
 if(angular) poly(cloth,[[11,-71],[37,-73],[48,-61],[47,-33],[36,-28],[28,-33],[18,-29],[7,-34],[8,-57]]);
 else path(cloth,p=>{p.moveTo(12,-70);p.bezierCurveTo(0,-57,7,-39,7,-34);p.quadraticCurveTo(18,-27,29,-33);p.quadraticCurveTo(40,-26,47,-34);p.lineTo(46,-60);p.quadraticCurveTo(39,-77,12,-70);p.closePath();});
 if(s.id!=='C') poly(dark,[[36,-69],[44,-61],[46,-34],[34,-32],[32,-48]],0);
 poly('#fff0cb',[[20,-71],[33,-71],[28,-47]],0);
 poly(dark,[[13,-69],[20,-72],[25,-51],[15,-58],[18,-63]],.8);
 poly(dark,[[33,-71],[40,-64],[34,-58],[37,-54],[28,-48]],.8);
 poly(role==='usher'?'#e8c464':'#f18765',[[25,-69],[30,-69],[29,-62],[34,-50],[29,-44],[25,-52]],1);
 for(let i=0;i<2;i++)oval('#f5dda0',29,-43+i*7,1.4,1.4,0);
 limb(cloth,comic?9:12,[[13,-62],[2,-50+armBob*0.6],[-12,-54+armBob]]);
 oval(s.skin,-15,-54+armBob,comic?8:7,6);
 for(let i=0;i<2;i++)line(s.shade,1.2,[[-19+i*4,-56+armBob],[-19+i*4,-51+armBob]]);
 if(role==='usher'){
  c.save();c.translate(52,-30);c.rotate(sway*.14);
  line('#9c7437',2,[[-4,0],[-4,-5],[4,-5],[4,0]]);
  box('#c09a4e',-9,0,18,23,3);box('#ffe59b',-6,3,12,16,1,0);
  oval('#fff9d3',0,11,3,5+Math.sin(t*7),0);line('#a67f3a',1.5,[[0,2],[0,20]]);c.restore();
 }
 if(role==='gardener'){
  box('#6aa77a',10,-54,30,23,3,1);box('#44805e',17,-49,16,11,2,0);
  line('#bddb99',1.3,[[18,-48],[30,-48]]);
  line('#a16d3e',4,[[52,-31],[54,-5]]);
  poly('#d2d8e0',[[49,-14],[59,-14],[59,-5],[54,0],[49,-5]],1.3);
 }
 if(role==='clerk'){
  box('#fff2d5',35,-59,9,10,1,1);box('#e49a60',37,-57,5,3,0,0);
  box('#a86a42',45,-26,20,19,3);line('#e3ad70',1.5,[[49,-22],[61,-22]]);
  line('#715044',2,[[50,-26],[50,-30],[58,-30],[58,-26]]);
 }
 // Deliberately round / broad / bean-shaped faces, not palette swaps of round one.
 const headBob=idle?1.1*Math.sin(t*1.7+1.3):0;
 c.save();c.translate(-1,-1+sway*0.6+land*0.8+headBob);c.rotate(sway*.02+loll);
 oval(s.shade,11,-87,6,8);
 if(angular) poly(s.skin,[[10,-103],[22,-111],[45,-109],[51,-99],[49,-77],[40,-67],[18,-70],[8,-82]]);
 else if(comic)path(s.skin,p=>{p.moveTo(12,-104);p.bezierCurveTo(34,-124,58,-106,49,-84);p.bezierCurveTo(55,-65,28,-61,15,-71);p.bezierCurveTo(-1,-81,0,-96,12,-104);p.closePath();});
 else path(s.skin,p=>{p.moveTo(11,-103);p.bezierCurveTo(17,-115,47,-112,49,-98);p.lineTo(49,-81);p.bezierCurveTo(49,-64,13,-65,10,-81);p.quadraticCurveTo(3,-94,11,-103);p.closePath();});
 if(angular)poly(s.shade,[[41,-107],[50,-98],[48,-77],[38,-69],[33,-72],[39,-87]],0);
 else if(!comic)oval(s.shade,41,-79,7,5,0);
 // Heavy lids, red pupils and two blunt teeth keep them undead, distinct from Gary.
 const blinkPhase=((t+0.31)%4.1+4.1)%4.1;
 const blink=idle?Math.max(0,1-Math.abs(blinkPhase-3.88)/0.11):0;
 const eyeOpen=1-0.92*blink;
 const eyeY=-91, eyeR=comic?9:7;
 oval('#fff4ce',19,eyeY,eyeR,(comic?11:8)*eyeOpen,comic?2:.8);
 oval('#fff4ce',38,eyeY+2,eyeR-1,(comic?9:6)*eyeOpen,comic?2:.8);
 oval('#c65458',vacant?20:17,eyeY+2,vacant?1.4:2.5,(vacant?2:3.3)*eyeOpen,0);oval('#c65458',vacant?35:36,eyeY+3,vacant?1.2:2.4,(vacant?1.8:3)*eyeOpen,0);
 if(vacant){
  box(s.skin,11,eyeY-9,16,9,1,0);box(s.skin,31,eyeY-5,15,6,1,0);
  line(s.shade,1.6,[[12,eyeY],[25,eyeY]]);
 }else line(s.shade,comic?4:3,[[11,eyeY-5],[25,eyeY-3]]);
 line(s.ink,comic?3:1.6,vacant?[[32,eyeY+1],[44,eyeY+1]]:[[31,eyeY-3],[45,eyeY-6]]);
 oval(s.shade,26,-82,4.5,3,0);
 if(vacant){
  // Slack, off-centre jaw: no upturned smile or focused stare.
  box('#654254',23,-77,12,9+Math.sin(t*2)*.7,3,0);
  box('#fff1cd',24,-77,4,3,1,0);
 }else{
  path('#654254',p=>{p.moveTo(17,-77);p.quadraticCurveTo(27,-71+step,40,-78);p.lineTo(37,-70);p.quadraticCurveTo(26,-67,18,-72);p.closePath();},0);
  box('#fff1cd',22,-76,5,5,1,0);box('#fff1cd',32,-76,4,4,1,0);
 }
 line('#6e9d52',1.3,[[32,-104],[42,-101]]);
 for(let i=0;i<3;i++)line('#f0ecae',1,[[33+i*3,-106+i],[33+i*3,-102+i]]);
 if(role==='usher'){
  box('#5e4382',13,-125,34,22,angular?2:5);box('#e9ad57',13,-111,34,6,1,0);
  oval('#704f99',29,-104,26,5);line('#ad8bd0',1.5,[[19,-121],[38,-121]]);
 } else if(role==='gardener'){
  path('#d29a48',p=>{p.moveTo(9,-106);p.quadraticCurveTo(8,-123,28,-123);p.quadraticCurveTo(46,-123,48,-106);p.closePath();});
  box('#699765',10,-111,38,6,2,0);oval('#eab862',29,-105,27,5);
  poly('#78ac71',[[43,-118],[49,-126],[48,-116],[54,-121],[49,-111]],.7);
 } else {
  path('#596e7c',p=>{p.moveTo(10,-103);p.quadraticCurveTo(7,-115,26,-113);p.lineTo(41,-108);p.lineTo(33,-101);p.lineTo(30,-106);p.lineTo(18,-101);p.closePath();});
  box('rgba(255,255,255,.08)',10,-98,17,13,3,1.4);box('rgba(255,255,255,.08)',31,-97,17,12,3,1.4);
  line('#80555b',1.6,[[27,-91],[31,-91]]);
 }
 c.restore();c.restore();
}
export function drawCryptHeadstone(c,t,s,{animated=false}={}){
 const {path,poly,box,oval,line}=painter(c,s),angular=s.id==='B';
 // Slab only: no pedestal, feet, moss shoulders or root/arm silhouette.
 if(angular)poly(s.stone,[[7,0],[7,-74],[21,-90],[49,-90],[62,-75],[62,0]],2.4);
 else path(s.stone,p=>{p.moveTo(7,0);p.lineTo(7,-65);p.bezierCurveTo(7,-99,62,-101,62,-65);p.lineTo(62,0);p.closePath();},s.edge);
 if(angular)poly(s.stoneShade,[[49,-90],[62,-75],[62,0],[53,0],[53,-73],[44,-84]],0);
 else path(s.stoneShade,p=>{p.moveTo(46,-86);p.quadraticCurveTo(62,-80,62,-64);p.lineTo(62,0);p.lineTo(53,0);p.lineTo(53,-64);p.quadraticCurveTo(54,-78,46,-86);p.closePath();},0);
 line('#ede9f4',2,[[14,-64],[16,-74],[24,-82],[37,-83]]);
 if(s.id==='C'){
  oval('#fff0bb',25,-54,8,10);oval('#fff0bb',45,-54,8,10);
  oval('#92526e',27,-52,3,4,0);oval('#92526e',43,-52,3,4,0);
  line(s.ink,3,[[16,-65],[31,-61]]);line(s.ink,3,[[39,-61],[53,-66]]);
 }else{
  poly('#54435e',[[17,-60],[31,-55],[30,-44],[18,-46]],0);
  poly('#54435e',[[39,-55],[53,-60],[52,-46],[40,-44]],0);
  line('#f8c877',2.5,[[21,-50],[27,-49]]);line('#f8c877',2.5,[[43,-49],[49,-50]]);
 }
 const jaw=animated?Math.sin(t*3)*1.5:0;
 // The first study's opposing upper/lower jaw motion, enlarged enough to read
 // in the lane; the stone itself never rocks or sprouts limbs.
 path('#564059',p=>{p.moveTo(20,-28);p.quadraticCurveTo(35,-42-(animated?jaw:Math.sin(t*3)),50,-28);p.lineTo(46,-15+(animated?jaw*2:0));p.quadraticCurveTo(33,-20+(animated?jaw*2:0),22,-15+(animated?jaw*2:0));p.closePath();},0);
 for(let i=0;i<4;i++)poly('#fff0ca',[[24+i*6,-30],[28+i*6,-30],[26+i*6,-23]],0);
 line(s.stoneShade,1.7,[[35,-84],[31,-73],[38,-65],[34,-59]]);
}

export const CRYPT_ZOMBIE_ROLES = ['usher','gardener','clerk'];
export function cryptZombieRole(phase = 0) {
 return CRYPT_ZOMBIE_ROLES[Math.abs(Math.floor((Number.isFinite(phase)?phase:0)*997))%3];
}
// NEVER THE SAME ONE TWICE IN A ROW (Peter, 26 Sep 2026). The costume used to be a hash of
// the spawn phase, which could deal the same role to neighbours. Now roles are dealt in the
// order zombies first appear, each one of the two the last one wasn't, and remembered by
// spawn phase (fixed for the zombie's life), so a costume never changes on screen.
const ROLE_MEMO = new Map();
let lastRole = null;
export function cryptZombieRoleInOrder(phase = 0) {
 const key = Math.round((Number.isFinite(phase) ? phase : 0) * 1e6);
 let r = ROLE_MEMO.get(key);
 if (!r) {
  const others = CRYPT_ZOMBIE_ROLES.filter((x) => x !== lastRole);
  r = others[Math.abs(Math.floor((Number.isFinite(phase) ? phase : 0) * 997)) % others.length];
  ROLE_MEMO.set(key, r);
  lastRole = r;
  if (ROLE_MEMO.size > 256) ROLE_MEMO.delete(ROLE_MEMO.keys().next().value);
 }
 return r;
}
/** Pure live painter, feet-anchored; art size is independent of entity collision. */
// `facing` -1 turns a zombie walking away to face right; `idle`/`pace` as drawCryptZombie.
export function drawSelectedCryptEnemy(c,t,role,x,y,{facing=1,idle=false,pace=1,phase=null}={}) {
 c.save();
 // The lane headstone: smaller and seated lower since 26 Sep 2026 (Peter: "the grave
 // stones in the lane need to be a bit lower and smaller") — 23 → 16 tall, its foot sunk
 // 2 px into the road and clipped at the ground line so it reads set in, not perched.
 const stone=role==='stone', h=stone?16:28, authored=stone?92:role==='clerk'?116:129;
 if(stone){c.beginPath();c.rect(x-40,y-60,80,60);c.clip();}
 c.translate(x,y+(stone?2:0));
 if(!stone&&facing<0)c.scale(-1,1);
 c.scale(h/authored,h/authored);c.translate(stone?-34:-24,0);
 if(stone)drawCryptHeadstone(c,t,CRYPT_ART_STYLES[1],{animated:true});
 else drawCryptZombie(c,t,role,CRYPT_ART_STYLES[0],{vacant:true,idle,pace,phase});
 c.restore();
}
