// One prominent original artwork per wall bay; the collection changes with the wall's
// absolute position, so a repeated architectural bay need not repeat its art.
import { box, line, poly, circ, ell, letters, hash, canvas, PAL } from './line.js';
import { WALL_BASE, FACTORS, OFFICE_ZOOM, officeFrame } from '../officeClimb.js';
import { OFFICE_CORRIDORS, officeFurnitureCuts, officeLandmarks } from './progression.js';
import { poster } from './wall.js';
import { PROFESSOR_PIECES, PROFESSOR_BY_FLOOR, paintFramedProfessor } from './professorArt.js';

const COLLECTIONS={
  lobby:['sunrise','jazz','botanical','city','waves','mobile','vase','mountains'],
  open:['fish','blueprint','jazz','portrait','mobile','waves','botanical','certificate'],
  exec:['mountains','portrait','constellation','vase','city','waves','botanical','sunrise'],
};
// Floor 23's walls carry the office's own motivational posters, out among the desks: each
// design once in turn along the floor (assignPosters).
export const OFFICE_POSTERS={
 open:[{label:'TEAMWORK'},{label:'HANG IN THERE',bg:'#cdb9ef',sub:'UNTIL FRIDAY'},{label:'INNOVATION'},
  {label:'SUCCESS'},{label:'PERSEVERANCE'},{label:'LEADERSHIP'},{label:'OPPORTUNITY'},
  {label:'HANG IN THERE',bg:'#a9e3d6',sub:'UNTIL Q4'},{label:'EXCELLENCE'}],
};
const POSTER_SIZE={w:56,h:74},KITTEN_SIZE={w:56,h:80},OFFICE_POSTER_CLEAR=200;
export const officePosterSize=(p)=>p.label==='HANG IN THERE'?KITTEN_SIZE:POSTER_SIZE;
const PALETTES=[['#efd5ba','#da796b','#445c79','#e9b852'],['#c4d9da','#416e79','#d590ac','#f0ddb4'],
 ['#eaddeb','#705484','#cb925e','#acc9b2'],['#e8e4c9','#58867a','#bc655b','#344757']];

// The founder hangs once per piece (officeFounderPlan), between the named rooms. Other bays
// occasionally get one print; endless runs can also show one founder piece in a free bay.
const GENERIC_SKIP=0.42;
// Floor 23's short stretches of wall between the windows nearly all get something.
const GENERIC_SKIP_BY_FLOOR={open:0.12};
const FALLBACK_SHARE=0.22;

// A wall bay's single slot in the wall's ABSOLUTE coordinates (its own u plus whole periods), so
// which picture hangs where never depends on what is on screen.
function wallBays(def){
 return def.bays.map((b,i)=>({...b,i})).filter(b=>b.type==='wall');
}
function hangBoxes(def,j){
 const P=def.period,out=[];
 for(const h of def.hangs)for(const jj of [j-1,j,j+1]){
  const clock=h.kind==='clock',hx=h.u+jj*P;
  const hy=h.y??WALL_BASE-(h.h||0);
  out.push({x:clock?hx-h.r:hx,y:clock?hy-h.r:hy,w:h.w||h.r*2,h:h.h||h.r*2,kind:h.kind});
 }
 return out;
}
// The plain wall a bay really offers: where a cleared window run beside it is only partly taken
// by a room or lift, the bare wall left over joins the bay's own.
function wallSpan(plan,x0,x1){
 let a=x0,b=x1;
 for(const s of plan?.walls||[]){
  if(Math.abs(s.u1-x0)<1)a=Math.min(a,Math.max(s.occ[1],s.u0));
  if(Math.abs(s.u0-x1)<1)b=Math.max(b,Math.min(s.occ[0],s.u1));
 }
 return [a,b];
}
function layoutBay(floor,def,bay,j,pick,target=null,posterFor=null,plan=null){
 const P=def.period,x0=bay.u+j*P,x1=bay.u1+j*P,absolute=Math.round(x0),list=COLLECTIONS[floor];
 const seed=absolute*7+bay.i*137,key=j+'|'+bay.i+'|0',hangs=hangBoxes(def,j);
 if(hangs.some(o=>['poster','painting','portrait'].includes(o.kind)&&o.x<x1&&o.x+o.w>x0))return [];
 const professor=pick?pick(key,seed):null;
 const posters=OFFICE_POSTERS[floor],poster=!professor&&!target&&posters
  ?(posterFor?posterFor(key)
    :posters[((Math.floor(absolute/(P/3))%posters.length)+posters.length)%posters.length]):null;
 const d=target||(professor&&PROFESSOR_PIECES[professor])||(poster&&officePosterSize(poster));
 const w=d?.w??[66,76,86][Math.floor(hash(seed+1)*3)];
 const h=d?.h??[64,74,84][Math.floor(hash(seed+2)*3)];
 const y0=d?62+Math.floor(hash(seed+11)*10):62+Math.floor(hash(seed+3)*14);
 if(w>x1-x0-24)return [];
 // centred on the plain wall actually there
 const [s0,s1]=wallSpan(plan,x0,x1);
 const center=(s0+s1-w)/2;
 const xs=[center,x0+12,x1-w-12].filter((x,i,a)=>a.indexOf(x)===i);
 const ys=[y0,54,72].filter((y,i,a)=>a.indexOf(y)===i);
 const cost=({x,y})=>Math.abs(x-center)+Math.abs(y-y0)*0.35;
 const candidates=xs.flatMap(x=>ys.map(y=>({x,y}))).sort((a,b)=>cost(a)-cost(b));
 const place=candidates.find(({x,y})=>!hangs.some(o=>x+w+8>o.x&&x-8<o.x+o.w&&y+h+8>o.y&&y-8<o.y+o.h));
 if(!place)return [];
 return [{...place,w,h,seed,key,avail:s1-12-place.x,occupied:false,professor,j,
  sparse:!professor&&!poster&&hash(seed+12)<(GENERIC_SKIP_BY_FLOOR[floor]??GENERIC_SKIP),poster,
  kind:list[((Math.floor(absolute/100)+bay.i*3)%list.length+list.length)%list.length]}];
}
// The floor's pieces hang in order along it, one per free bay, each in the free bay nearest its
// evenly spaced place between the first and last planned places, clear of the wall sections.
function assignFounder(plan,floor,def){
 if(plan.assigned)return plan.assigned;
 const P=def.period,bays=wallBays(def),assigned=new Map(),n=plan.entries.length;
 const lo=Math.min(...plan.entries.map(e=>e.abs)),hi=Math.max(...plan.entries.map(e=>e.abs));
 const free=[];
 for(let j=Math.floor(lo/P)-1;j<=Math.floor(hi/P)+1;j++)for(const bay of bays){
  const x0=bay.u+j*P,x1=bay.u1+j*P;
  if((x0+x1)/2<lo-200||(x0+x1)/2>hi+200)continue; // within the stage, not behind the start
  if(plan.avoid.some(([a,b])=>x1>a&&x0<b))continue;
  free.push({j,bay,mid:(x0+x1)/2});
 }
 free.sort((a,b)=>a.mid-b.mid);
 const used=new Set();
 plan.entries.forEach((e,i)=>{
  const d=PROFESSOR_PIECES[e.id];
  const want=n>1?lo+i*(hi-lo)/(n-1):lo;
  // the free bay nearest its evenly spaced place that the piece fits
  // a bay beside a lift counts as a third of a period nearer: the founder hangs by the lifts
  const byLift=(k)=>(plan.lifts||[]).some(([a,b])=>free[k].mid>a-P/4&&free[k].mid<b+P/4);
  const cost=(k)=>Math.abs(free[k].mid-want)-(byLift(k)?P/3:0);
  const order=free.map((_,k)=>k).sort((a,b)=>cost(a)-cost(b));
  for(const k of order){
   if(used.has(k))continue;
   if(Math.abs(free[k].mid-want)>P*0.75)continue; // never hung far from its place
   const {j,bay}=free[k];
   const sl=layoutBay(floor,def,bay,j,null,d,null,plan)[0];
   if(!sl||sl.avail<d.w)continue;
   assigned.set(sl.key,e.id);used.add(k);
   break;
  }
 });
 plan.assigned=assigned;
 return assigned;
}

// Whether desks stand in front of a poster's place when it is in the middle of the screen: the
// corridor furniture there is not cleared for a room or lift. Fixed per place, so never flickers.
function amongDesks(plan,floor,sl){
 plan.desks??=new Map();
 let ok=plan.desks.get(sl.key);
 if(ok==null){
  const rate=FACTORS.wall*OFFICE_ZOOM,cam=(sl.x+sl.w/2-240)/rate;
  const frame=officeFrame(floor,cam,0,{left:-64,right:544},OFFICE_CORRIDORS[floor]);
  const cuts=officeFurnitureCuts(frame,officeLandmarks(floor,cam,plan.totalDist));
  const a=240-sl.w/2-30,b=240+sl.w/2+30;
  // some desks either side of it on screen, though the stretch right in front may be cleared
  const desks=frame.mid.items.filter(m=>m.kind==='cubicles'&&!cuts.some(([c0,c1])=>m.x0>=c0-1&&m.x1<=c1+1));
  ok=desks.some(m=>m.x1>a-140&&m.x0<b+140);
  plan.desks.set(sl.key,ok);
 }
 return ok;
}
// On a real stage the posters go, in turn, to the free bays that have desks in front of them,
// so every design turns up and none hangs on an empty stretch of wall.
function assignPosters(plan,floor,def){
 if(plan.posters)return plan.posters;
 const list=OFFICE_POSTERS[floor],out=new Map();
 plan.posters=out;
 if(!list)return out;
 const P=def.period,bays=wallBays(def),end=plan.totalDist*FACTORS.wall*OFFICE_ZOOM+P;
 let i=0;
 for(let j=0;j*P<end;j++)for(const bay of bays){
  if(plan.assigned.has(j+'|'+bay.i+'|0'))continue;
  const [sl]=layoutBay(floor,def,bay,j,null,KITTEN_SIZE,null,plan);
  if(!sl||plan.avoid.some(([a,b])=>sl.x+sl.w>a&&sl.x<b)||!amongDesks(plan,floor,sl))continue;
  out.set(sl.key,list[i++%list.length]);
 }
 return out;
}
export function officeArtworks(f){
 const def=f.wall.def,P=def.period,shift=f.wall.shift,cov=f.coverage,plan=f.founderPlan;
 const assigned=plan?assignFounder(plan,f.floor,def):null;
 const posterFor=plan&&OFFICE_POSTERS[f.floor]?(assignPosters(plan,f.floor,def),key=>plan.posters.get(key)||null):null;
 const state={last:null};
 const pick=assigned?key=>assigned.get(key)||null:(key,seed)=>{
  if(hash(seed+9)>=FALLBACK_SHARE)return null;
  const ids=PROFESSOR_BY_FLOOR[f.floor],id=ids[Math.floor(hash(seed+10)*ids.length)];
  if(id===state.last)return null;
  state.last=id;
  return id;
 };
 const out=[],bays=wallBays(def);
 for(let j=Math.floor((shift+cov.left-160)/P)-1;j<=Math.floor((shift+cov.right+160)/P)+1;j++){
  for(const bay of bays){
   for(const sl of layoutBay(f.floor,def,bay,j,pick,null,posterFor,plan)){
    if(sl.occupied||sl.sparse)continue;
    if(plan&&!sl.professor&&plan.avoid.some(([a,b])=>sl.x+sl.w>a&&sl.x<b))continue; // no print behind a room or lift
    const x=sl.x-shift;
    if(x+sl.w<cov.left-20||x>cov.right+20)continue;
    out.push({x,y:sl.y,w:sl.w,h:sl.h,seed:sl.seed,kind:sl.professor?'professor':sl.poster?'poster':sl.kind,professor:sl.professor,poster:sl.poster});
   }
  }
 }
 if(plan?.finish){
  const fin=plan.finish,d=PROFESSOR_PIECES[fin.id],x=fin.abs-d.w/2-shift;
  if(x+d.w>cov.left-20&&x<cov.right+20)out.push({x,y:64,w:d.w,h:d.h,seed:7,kind:'professor',professor:fin.id});
 }
 return out.sort((a,b)=>a.x-b.x);
}
function motif(g,kind,seed,C){
 const [paper,a,b,c]=C;
 box(g,0,0,100,100,paper);
 if(kind==='mountains'||kind==='sunrise'){
  circ(g,kind==='sunrise'?69:25,27,16,c);
  poly(g,[0,75,27,33,62,80,83,46,100,65,100,100,0,100],b);
  poly(g,[0,87,41,58,68,83,100,72,100,100,0,100],a);
  line(g,0,90,100,90,paper,1);
 }else if(kind==='city'){
  circ(g,76,25,17,c);box(g,0,71,100,29,a);
  for(let i=0;i<6;i++){
   const x=i*18-3,h=25+hash(seed+i)*39;
   box(g,x,76-h,14,h,i%2?a:b);
   for(let yy=80-h;yy<71;yy+=8)for(let xx=x+3;xx<x+12;xx+=5)box(g,xx,yy,2,3,paper);
  }
  for(let i=0;i<4;i++)line(g,0,82+i*5,100,82+i*5,b,.6);
 }else if(kind==='botanical'){
  line(g,49,88,52,16,b,2);
  for(let i=0;i<5;i++){
   const y=26+i*12,side=i%2?1:-1;
   ell(g,51+side*13,y,15,5,i%2?a:b);
   line(g,51,y+6,51+side*23,y,paper,.65);
  }
  box(g,31,78,38,12,c,b,1);
 }else if(kind==='vase'){
  box(g,0,78,100,22,b);
  poly(g,[35,49,66,49,61,86,40,86],a,b,1);
  for(let i=0;i<5;i++){
   const x=25+i*13,y=20+hash(seed+i)*22;
   line(g,51,52,x,y,b,1.5);
   for(let j=0;j<5;j++)circ(g,x+Math.cos(j*1.256)*5,y+Math.sin(j*1.256)*5,4,j%2?a:c);
   circ(g,x,y,2,paper);
  }
 }else if(kind==='portrait'){
  box(g,0,0,42,100,c);
  poly(g,[14,100,26,71,72,70,89,100],b);
  ell(g,51,43,23,29,a,b,1);
  poly(g,[29,39,31,17,49,10,70,21,74,38,57,24,47,40],b);
  line(g,55,40,59,55,b,1.4);line(g,42,65,59,63,b,1.5);
  line(g,36,41,46,40,b,1.3);line(g,60,40,67,42,b,1.3);
  circ(g,32,59,4,c);circ(g,70,59,4,c);
 }else if(kind==='waves'){
  circ(g,73,24,14,a);
  for(let i=0;i<7;i++){
   const points=[0,100,0,46+i*8];
   for(let x=0;x<=100;x+=5)points.push(x,46+i*8+Math.sin(x*.085+i*.5)*6);
   points.push(100,100);poly(g,points,i%2?b:c);
  }
 }else if(kind==='fish'){
  for(let i=0;i<3;i++){
   const x=40+(i%2)*18,y=25+i*25;
   poly(g,[x-18,y,x-31,y-12,x-31,y+12],i%2?a:b);
   ell(g,x,y,23,11,i%2?a:b);circ(g,x+13,y-2,2,paper);
   line(g,x-5,y-7,x-5,y+7,c,1.5);
  }
  for(let i=0;i<6;i++)circ(g,85+(i%2)*6,12+i*14,2,null,b,.8);
 }else if(kind==='constellation'){
  box(g,0,0,100,100,b);
  const p=[[18,25],[40,17],[58,40],[82,33],[69,73],[35,80],[18,25]];
  for(let i=1;i<p.length;i++)line(g,...p[i-1],...p[i],c,.7);
  for(const [x,y] of p){circ(g,x,y,2,paper);line(g,x-4,y,x+4,y,paper,.7);line(g,x,y-4,x,y+4,paper,.7);}
  for(let i=0;i<18;i++)circ(g,hash(seed+i)*100,hash(seed+i+99)*100,.7,c);
 }else if(kind==='blueprint'){
  box(g,0,0,100,100,b);
  for(let n=10;n<100;n+=10){line(g,n,0,n,100,a,.35);line(g,0,n,100,n,a,.35);}
  ell(g,50,48,24,33,null,paper,1.4);
  poly(g,[28,44,39,52,50,43,61,53,72,44],null,c,1.3,false);
  line(g,17,15,17,81,paper,.8);line(g,12,15,22,15,paper,.8);line(g,12,81,22,81,paper,.8);
  letters(g,'EGG 01',50,94,7,{ink:paper,lw:1,align:'center'});
 }else if(kind==='certificate'){
  box(g,6,6,88,88,null,b,1);box(g,10,10,80,80,null,c,.7);
  letters(g,'EXCELLENCE',50,28,7,{ink:b,lw:1,align:'center'});
  letters(g,'IN MEETINGS',50,42,6,{ink:b,lw:.8,align:'center'});
  for(let i=0;i<3;i++)line(g,22,53+i*6,78,53+i*6,a,.7);
  poly(g,[43,76,42,95,50,89,58,95,57,76],a);
  circ(g,50,77,10,c,b,1);
 }else if(kind==='mobile'){
  line(g,50,0,50,18,b,1);line(g,20,24,81,15,b,1.2);
  for(const [x,y,col] of [[23,57,a],[53,79,b],[79,44,c]]){
   line(g,x,22,x,y-9,b,.8);ell(g,x,y,13,9,col,b,.7);
  }
 }else{
  // Jazz-print collage: diagonal keyboard, brass disc and saxophone curve.
  circ(g,71,27,23,c);poly(g,[4,16,29,5,95,87,70,99],b);
  for(let i=0;i<7;i++){const x=20+i*9,y=19+i*11;line(g,x-8,y+4,x+6,y-7,paper,3);}
  g.beginPath();g.moveTo(64,17);g.bezierCurveTo(24,22,86,70,38,80);g.strokeStyle=a;g.lineWidth=9;g.stroke();
 }
}
// The founder's pieces are baked once per floor and scale and blitted, like the wall strips.
const BAKED=new Map();
function bakedProfessor(id,floor,k){
 const key=`${floor}@${k}|${id}`;
 let c=BAKED.get(key);
 if(!c){
  const d=PROFESSOR_PIECES[id];
  c=canvas((d.w+3)*k,(d.h+4)*k);
  const g=c.getContext('2d');
  g.scale(k,k);
  paintFramedProfessor(g,id,0,0,PAL[floor]);
  BAKED.set(key,c);
 }
 return c;
}
export function warmOfficeArtwork(floor,k){
 for(const key of BAKED.keys())if(!key.startsWith(`${floor}@${k}|`))BAKED.delete(key);
 for(const id of PROFESSOR_BY_FLOOR[floor])bakedProfessor(id,floor,k);
}
export function officeArtworkBytes(){
 let bytes=0;
 for(const c of BAKED.values())bytes+=c.width*c.height*4;
 return bytes;
}
export function paintOfficeArtwork(g,f,P,k=2){
 for(const art of officeArtworks(f)){
  if(art.professor){
   const c=bakedProfessor(art.professor,f.floor,k);
   g.drawImage(c,art.x,art.y,c.width/k,c.height/k);
   continue;
  }
  if(art.poster){poster(g,{x:art.x,y:art.y,w:art.w,h:art.h,...art.poster},P);continue;}
  paintOfficePrint(g,art,f.floor,P);
 }
}
// One of the framed prints that fill the other wall bays.
export function paintOfficePrint(g,{x,y,w,h,seed,kind},floor,P){
  const C=PALETTES[Math.floor(hash(seed+8)*PALETTES.length)];
  const frame=floor==='exec'?(seed%2?'#d1b371':'#493346'):(seed%3?'#eee4d8':'#353746');
  box(g,x+2,y+3,w,h,'rgba(25,20,35,.17)');
  box(g,x,y,w,h,frame,P.ink,.75);
  box(g,x+3,y+3,w-6,h-6,'#f4eddf',P.ink,.35);
  g.save();g.beginPath();g.rect(x+7,y+7,w-14,h-14);g.clip();
  g.translate(x+7,y+7);g.scale((w-14)/100,(h-14)/100);
  motif(g,kind,seed,C);g.restore();
  line(g,x+1,y+1,x+w-1,y+1,'rgba(255,255,255,.55)',.7);
}
export const OFFICE_PRINTS=COLLECTIONS;
