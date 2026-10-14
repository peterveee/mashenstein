import { box,rbox,poly,line,ell,PAL } from './line.js';
import { MID_BASE } from '../officeClimb.js';
import { bite,pedestalTable,eggLunch,cake,cup } from './diners.js';
import { studyHead } from './peopleHeads.js';
const ink=PAL.open.inkM;
function sleeve(g,pts,color,w=2.6){g.beginPath();g.moveTo(pts[0],pts[1]);g.lineTo(pts[2],pts[3]);g.lineTo(pts[4],pts[5]);g.lineCap='round';g.lineJoin='round';g.strokeStyle=ink;g.lineWidth=w+.65;g.stroke();g.strokeStyle=color;g.lineWidth=w;g.stroke();}
export function lunchPeople(g,d,f,P,variant){
 const b=MID_BASE,ty=b-28,seat=b-15,center=(d.span[0]+d.span[1])/2;
 const sep=variant==='compact'?25:variant==='selected'?31:30;
 const cafe=d.room==='cafe';
 const people=cafe?[{x:center-sep,dir:1,skin:'#b68159',hair:'#49382f',style:'crop',shirt:'#3d3a4e'},
 {x:center+sep,dir:-1,skin:'#f2d3b0',hair:'#c78d37',style:'sweep',shirt:'#d6a640'}]:[{x:center-sep,dir:1,skin:'#e7b78e',hair:'#49382f',style:'part',shirt:'#7aa7a1'},
 {x:center+sep,dir:-1,skin:'#a96f50',hair:'#292730',style:'curls',shirt:'#c598b0'}];
 // Chair backs and seats are behind the sitters, feet are visibly on the floor.
 for(const p of people){g.save();g.translate(p.x,0);g.scale(p.dir,1);
  if(variant==='selected'){}
  else if(variant==='booth'){rbox(g,-11,b-39,8,37,2,'#d39b58',ink,.5);rbox(g,-8,seat,21,4,1,'#dfb36f',ink,.5);}
  else {rbox(g,-9,b-35,5,17,1.5,variant==='compact'?'#699d9c':'#d7ad62',ink,.5);rbox(g,-8,seat,21,3,1,'#d7ad62',ink,.5);for(const x of [-6,10])line(g,x,seat+3,x+1,b,ink,.9);}
  // Bent lap and shin form one silhouette, with the seat underneath the thigh.
  poly(g,[-4,seat-5,10,seat-4,12,seat-2,11,b-3,7,b-3,7,seat+1,-4,seat+1],'#545062',ink,.45);
  rbox(g,6,b-3,8,2.8,.8,'#36313a',ink,.4);
  // The selected diners take a leisurely spoonful about every 7.4 seconds.
  const sy=b-37,k=bite(f.t*(variant==='selected'?0.45:1),p.dir===1?0:1),hx=11-7*k,hy=(ty-2)*(1-k)+(sy-1)*k;
  // Far hand rests on the table; the near hand lifts the food.
  sleeve(g,[1,sy+3,5,ty-2,12,ty-1],p.shirt,2.1);ell(g,12,ty-1,1.5,.9,p.skin,ink,.3);
  poly(g,[-5,seat-2,5,seat-2,5,sy+2,2,sy-1,-4,sy],p.shirt,ink,.45);
  box(g,0,sy-3,2.6,4,p.skin,ink,.3);
  studyHead(g,2,sy-6,5,p.style,true,p.skin,p.hair);
  // Near sleeve starts inside the torso, without an outlined shoulder ball.
  sleeve(g,[0,sy+3,2.5,ty-1,hx,hy],p.shirt);poly(g,[-2,sy+1,2,sy+1,3,sy+5,-2,sy+6],p.shirt);
  if(cafe)cup(g,hx+2,hy+1,P,-1);
  ell(g,hx,hy,1.25,1.05,p.skin,ink,.3);
  if(cafe){}
  else if(variant==='compact'){poly(g,[hx,hy-1,hx+4,hy-1,hx+2,hy-4],'#ebc77e',ink,.3);line(g,hx+.5,hy-1.7,hx+3.5,hy-1.7,'#77964e',.6);}
  else {line(g,hx,hy,hx+2.2,hy-1.8,'#8d929b',.65);ell(g,hx+2.5,hy-2.1,.9,.6,'#e5e8ee',ink,.2);}
  g.restore();
 }
 if(variant==='selected')for(const p of people){
  const X=u=>p.x+p.dir*u,sy=seat,vinyl=d.room==='cafe'?'#a8355a':'#d9963a',light=d.room==='cafe'?'#d0688a':'#f5c977';
  // The existing production booth: unchanged end panel, piping and chrome plinth.
  poly(g,[X(8.4),b-2,X(8.4),sy+1.6,X(7.4),sy,X(-3.6),sy,X(-4.4),b-38,X(-6.2),b-41,X(-9.6),b-41,X(-11),b-38,X(-11),b-2],vinyl,ink,.5);
  poly(g,[X(7),sy+1.8,X(-5.8),sy+1.8,X(-6.4),b-37.6,X(-9.4),b-37.6,X(-9.4),b-3.4,X(7),b-3.4],null,light,.6);
  box(g,Math.min(X(-11),X(8.4)),b-2,19.4,2,P.chrome,ink,.35);
  poly(g,[X(9),sy-1.2,X(12.2),sy-1.2,X(10.9),b-2.4,X(8.1),b-2.4],'#545062',ink,.4);
  rbox(g,Math.min(X(7.6),X(13.2)),b-2.8,5.6,2.8,1.1,'#36313a',ink,.35);
 }
 pedestalTable(g,center-sep+(variant==='selected'?3.4:9),center+sep-(variant==='selected'?3.4:9),P,d.room);

 // Food is in front of the tabletop, arms already extend above its edge.
 for(const p of people){const x=p.x+p.dir*15;if(cafe){ell(g,p.x+p.dir*13,ty-.5,3.6,.9,'#f6f2e6',ink,.35);cake(g,x+p.dir*6,ty-.5,P);}else if(variant==='compact'){ell(g,x,ty-.5,5,1.2,'#fffaf0',ink,.35);cake(g,x+p.dir*8,ty-.5,P);}else eggLunch(g,x,ty-.5,P);}
}

export const selectedLunchPeople=(g,d,f,P)=>lunchPeople(g,d,f,P,'selected');
