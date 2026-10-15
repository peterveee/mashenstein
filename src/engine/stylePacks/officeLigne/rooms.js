import { selectedLunchPeople } from './lunchPeople.js';
// One-off occupied rooms behind the office corridor.
import { MID_BASE, WALL_BASE } from '../officeClimb.js';
import { box, line, poly, circ, ell, letters, textW, YH, VPX, OFFICE_FONT } from './line.js';
import { OFFICE_SIGN_MIN_Y, officeBulkhead, officeRoomLidShows } from './progression.js';
import { boardroomBack, chairFromBehind, midActors, sofa, plant, libGlobe, setOfficeEvacExit } from './room.js';
import { boothDiners } from './diners.js';
import { frothingBarista } from './barista.js';
import { paintCanteenZombieSide } from './profileZombie.js';

function caption(g,text,x,y,w,P){
  box(g,x,y,w,17,'#302c40',P.chrome,0.6);
  letters(g,text,x+w/2,y+12,6,{ink:'#f6e9d3',lw:0.75,align:'center'});
}
function gagNote(g,text,x,y,w,P){
  const track=0.4,size=Math.min(5,(w-6)*6/textW(text,6,track));
  box(g,x,y,w,14,'#f4ecd2',P.ink,0.45);
  letters(g,text,x+w/2,y+10,size,{ink:P.ink,lw:0.4,align:'center',track});
}
function sitters(g,xs,f,P,seed=20,away=false){
  const chairs=xs.map((x,i)=>({x,sitter:true,seed:seed+i,away,nod:(Math.sin(f.t*0.7+i)+1)*0.08}));
  if(!away)boardroomBack(g,{},P,chairs);
  midActors(g,{mid:{items:[{kind:'boardroom',chairs}]}},P);
  if(away)for(const ch of chairs)chairFromBehind(g,ch,P);
}
// A coffee mug on the table by each place, standing on it at (cx, base): the handle, the body
// in one of four office colours, the coffee showing at the rim. It was a plain tan disc, which
// beside a sitter's shoulder read as a hand (Peter, 15 Oct 2026: "wouldn't it be better if it
// was coffee cups?").
const MUGS=['#ffffff','#ff6fae','#2fbcb0','#f6df4a'];
function mug(g,cx,base,i,P){
  circ(g,cx+1.9,base-2.3,1.15,null,P.ink,0.9);
  circ(g,cx+1.9,base-2.3,1.15,null,MUGS[i%4],0.45);
  box(g,cx-1.7,base-4.4,3.4,4.4,MUGS[i%4],P.ink,0.3);
  ell(g,cx,base-4.4,1.7,0.5,'#5a3a24',P.ink,0.25);
}
function table(g,x,w,P){
  const b=MID_BASE;
  for(const dx of [x+9,x+w-9]){
    line(g,dx,b-25,dx,b-2,P.chrome,2);
    line(g,dx-4,b-2,dx+4,b-2,P.ink,1.3);
  }
  box(g,x,b-28,w,5,'#ead1a0',P.ink,0.6);
}

export function glassMeetingRoom(g,l,f,P){
  // the pane fills the room's opening from the ceiling track to the floor, no frame
  const {x,w}=l,top=f.ceilingY+officeBulkhead(f)+(MID_BASE-WALL_BASE)+2.2,bottom=MID_BASE-1;
  const left=x,right=x+w;
  // Frameless glass: a faint tint, bright edges where the panes end, butt joints between
  // panes, and a few long diagonal reflections.
  box(g,left,top,right-left,bottom-top,'rgba(190,225,236,0.16)');
  for(const u of [left+0.6,right-0.6])line(g,u,top,u,bottom,'rgba(235,250,252,0.85)',1.1);
  for(const u of [left+(right-left)/3,left+2*(right-left)/3])line(g,u,top+1,u,bottom-1,'rgba(235,250,252,0.45)',0.6);
  g.save();
  g.beginPath();g.rect(left,top,right-left,bottom-top);g.clip();
  const sheen='rgba(255,255,255,0.22)';
  for(const [u,wd] of [[0.08,10],[0.16,4],[0.58,14],[0.7,5]]){
    const sx=left+(right-left)*u;
    poly(g,[sx,top,sx+wd,top,sx+wd-60,bottom,sx-60,bottom],sheen);
  }
  g.restore();
}

function whiteboardText(g,text,x,y,size,maxWidth,color,weight=600){
  const family=OFFICE_FONT;
  g.save();
  g.textAlign='center';
  g.textBaseline='middle';
  g.fillStyle=color;
  g.font=`${weight} ${size}px ${family}`;
  const width=g.measureText(text).width;
  if(width>maxWidth)g.font=`${weight} ${size*maxWidth/width}px ${family}`;
  g.fillText(text,x,y);
  g.restore();
}

function standingWhiteboard(g,x,y,P,{title='AGENDA',detail=['1. PLAN THE NEXT','MEETING']}={}){
  const w=144,h=86,b=MID_BASE;
  // A broad mobile board uses plain, high-contrast sans lettering that remains
  // readable when the hallway is viewed at game scale.
  box(g,x+1.4,y+1.8,w,h,'#aaa9b0');
  box(g,x,y,w,h,'#51505b',P.ink,0.8);
  box(g,x+3,y+3,w-6,h-6,'#fffef9',P.ink,0.3);
  whiteboardText(g,title,x+w/2,y+26,14,w-18,'#202733',700);
  for(let i=0;i<detail.length;i++)
    whiteboardText(g,detail[i],x+w/2,y+52+i*14,10.5,w-20,'#4a5360',600);
  line(g,x+5,y+h-4,x+w-5,y+h-4,'#7d8490',1);
  line(g,x+9,y+h,x+9,b-2,'#777684',1);
  line(g,x+w-9,y+h,x+w-9,b-2,'#777684',1);
  line(g,x+9,b-2,x+w-9,b-2,'#777684',1);
  for(const u of [x+9,x+w-9])circ(g,u,b-1,1.4,'#d1cdd1',P.ink,0.3);
}

// The glass-box rooms seat everyone on the near side of the table, facing the whiteboard on the
// wall; the glass room of old faced them out at the corridor.
function meetingPeople(g,l,f,P,{training,interview,c,b}){
  const {x,w}=l,away=OFFICE_ROOM_STYLE!=='glass';
  const xs=interview?[c-47,c+47]:[c-73,c-24,c+24,c+73];
  // each room's people their own seeds (office-2's evacuation remembers them by it), and the
  // interview room's way out on its right, where its door is (glassDoor, Peter 15 Oct)
  const seed=training?60:interview?80:40;
  setOfficeEvacExit(interview&&f.floor==='open'?x+w-30:null);
  if(away){
    table(g,x+42,w-84,P);
    xs.forEach((px,i)=>{box(g,px-9,b-30,17,1.5,'#fffef1',P.ink,0.3);mug(g,px+12,b-28.6,i,P);});
    sitters(g,xs,f,P,seed,true);
    setOfficeEvacExit(null);
    return;
  }
  sitters(g,xs,f,P,seed);
  setOfficeEvacExit(null);
  table(g,x+42,w-84,P);
  xs.forEach((px,i)=>{box(g,px-9,b-30,17,1.5,'#fffef1',P.ink,0.3);mug(g,px+12,b-28.6,i,P);});
}
// What each room's whiteboard says. Floor 23's three are Peter's (15 Oct 2026: "I think these
// might be better options for our whiteboards in level 2"); its HR room carries one of two
// morale notices, drawn per run. Floor 88's meeting room plans the decade the same day.
function boardText(f,{training,interview,executive}){
  if(f.floor==='open'){
    if(training)return {title:'HOW TO LOOK BUSY',detail:['FAKING IT WHILE','DEAD INSIDE']};
    if(interview)return {title:'MANDATORY MORALE IMPROVEMENT',detail:(f.liftSeed||0)<0.5
      ?['ENTHUSIASM IS NOW A','TRACKED METRIC']:['BEATINGS WILL CONTINUE','UNTIL METRICS INCREASE']};
    return {title:'SURVIVING TUESDAY',detail:['1. ARRIVE','2. STARE INTO THE VOID','3. CLOCK OUT']};
  }
  if(executive)return {title:'STRATEGIC VISION 1989',detail:['1. BUY EGGS','2. SELL EGGS','3. ???']};
  return {
    title:training?'HOW TO LOOK BUSY':interview?'HR REVIEW':'AGENDA',
    detail:training?['ATTENDANCE IS','THE GOAL']:interview?['WHERE DO YOU SEE','YOURSELF IN 5 YEARS?']
      :['1. PLAN THE NEXT','MEETING'],
  };
}
function meetingContents(g,l,f,P,o){
  const {x,w}=l,{c}=o;
  if(!o.training){
    standingWhiteboard(g,c+w/2-158,95,P,boardText(f,o));
  }else{
    letters(g,'HOW TO LOOK BUSY',c,107,7,{ink:'#514f63',lw:0.9,align:'center'});
    letters(g,'ATTENDANCE IS THE GOAL',c,122,4.5,{ink:'#71627d',lw:0.45,align:'center'});
  }
  meetingPeople(g,l,f,P,o);
}

// ---- Meeting-room depth bake-off (12 Oct 2026), shown in the Lab gallery.
//   glass    — frameless glass straight onto the building's windows (the current look)
//   recess   — a room set back into the building: ceiling, side walls and floor in
//              perspective, its back wall and the people further away and smaller
//   box      — a glass box standing out into the corridor: side panes and a floor apron
//              in front, the people behind its front pane
//   frosted  — the recess behind a frosted manifestation band, the room lit cooler than
//              the corridor
//   partition — a solid partition wall with a door and a deep internal window into the recess
//   boxfrost  — B with a frosted band at the table's height (until 15 Oct 2026 frosted to the floor)
//   boxdesk   — B with a modesty panel down the front of the table: only the feet show
export const OFFICE_ROOM_STYLES=['glass','recess','box','frosted','partition','boxfrost','boxdesk'];
// Picked 12 Oct 2026: B2, the glass box frosted below the table (lightly). `?roomStyle=recess`
// previews another style in the real game.
const OFFICE_ROOM_PICK='boxfrost';
let OFFICE_ROOM_STYLE=(()=>{
  const q=typeof location!=='undefined'?new URLSearchParams(location.search).get('roomStyle'):null;
  return OFFICE_ROOM_STYLES.includes(q)?q:OFFICE_ROOM_PICK;
})();
export function setOfficeRoomStyle(style){
  const was=OFFICE_ROOM_STYLE;
  OFFICE_ROOM_STYLE=OFFICE_ROOM_STYLES.includes(style)?style:OFFICE_ROOM_PICK;
  return was;
}
export function officeRoomStyle(){return OFFICE_ROOM_STYLE;}
const ROOM_TONES={
  open:{back:'#e7e2ee',lit:'#dcd6e6',dark:'#c7c0d6',ceil:'#d2ccde',floor:'#97a3b6',floorLine:'#86919f',sky:'#a7d9ed',town:'#c5dce3'},
  exec:{back:'#3d3150',lit:'#342a46',dark:'#271f35',ceil:'#221b2e',floor:'#4b3c5c',floorLine:'#3d304d',sky:'#9a78a6',town:'#75627f'},
  lobby:{back:'#efe4e6',lit:'#e6d8dc',dark:'#d6c5cb',ceil:'#e2d6da',floor:'#c9b8bd',floorLine:'#b9a6ac',sky:'#a7d9ed',town:'#c5dce3'},
};
function glassFront(g,x0,x1,top,bottom,{tint='rgba(190,225,236,0.14)',edges=true,edge='rgba(235,250,252,0.85)',edgeW=1.1}={}){
  box(g,x0,top,x1-x0,bottom-top,tint);
  g.save();
  g.beginPath();g.rect(x0,top,x1-x0,bottom-top);g.clip();
  for(const [u,wd] of [[0.08,10],[0.16,4],[0.58,14],[0.7,5]]){
    const sx=x0+(x1-x0)*u;
    poly(g,[sx,top,sx+wd,top,sx+wd-60,bottom,sx-60,bottom],'rgba(255,255,255,0.2)');
  }
  g.restore();
  if(edges)for(const u of [x0+0.6,x1-0.6])line(g,u,top,u,bottom,edge,edgeW);
}
// The way in: a frameless glass door at the left end of the front pane, hung on chrome patch
// fittings at its hinge side, with a long chrome pull handle by its free edge and a hairline gap
// where it meets the fixed glass.
// sized to the room: the table top is 28 px of about 75 cm, so a 2.1 m door is about 100 px at the
// front pane's 1.3 scale, and 0.9 m wide
const DOOR_W=44,DOOR_H=104,DOOR_INSET=20;
function glassDoor(g,x0,top,bottom){
  // a door's height, not the pane's: the glass carries on above it as a fixed transom
  // set in from the corner by a fixed side panel, as a real glazed partition is
  const x=x0+DOOR_INSET,x1=x+DOOR_W,dt=Math.max(top+6,bottom-DOOR_H),h=bottom-dt;
  box(g,x,dt,DOOR_W,h-0.6,'rgba(220,242,248,0.12)');
  // the head: where the door stops and the transom starts
  line(g,x,dt,x1+0.9,dt,'rgba(30,40,60,0.45)',0.9);
  line(g,x,dt+0.9,x1+0.9,dt+0.9,'rgba(240,252,255,0.9)',0.6);
  line(g,x1,dt,x1,bottom-0.6,'rgba(30,40,60,0.45)',0.9);
  line(g,x1+0.9,dt,x1+0.9,bottom-0.6,'rgba(240,252,255,0.9)',0.6);
  line(g,x,dt,x,bottom-0.6,'rgba(240,252,255,0.7)',0.5);
  // the patch fittings, top and bottom on the hinge side
  for(const y of [dt+1,bottom-3.4])box(g,x,y,6,2.8,'#c9ced8','rgba(40,36,50,0.6)',0.35);
  // the pull: a long chrome bar on two stand-offs
  const hx=x1-5,hy0=dt+h*0.3,hy1=dt+h*0.62;
  for(const y of [hy0+2,hy1-2])line(g,hx-1.6,y,hx,y,'#9aa0ae',0.8);
  line(g,hx,hy0,hx,hy1,'#7d8494',1.8);
  line(g,hx-0.3,hy0+0.4,hx-0.3,hy1-0.4,'#eef0f4',0.6);
}
// The inside of a room seen through its front: ceiling, two side walls, floor and back wall in
// one-point perspective, a wide window in the back wall, and `contents` drawn scaled onto the
// far floor line.
function interior(g,x0,x1,top,bottom,f,P,contents,{inset=16,floorH=10,k=0.82,cool=0}={}){
  const T=ROOM_TONES[f.floor]||ROOM_TONES.open;
  const bx0=x0+inset,bx1=x1-inset,by0=top+inset*0.55,by1=bottom-floorH,cx=(x0+x1)/2;
  box(g,bx0,by0,bx1-bx0,by1-by0,T.back);
  // the back wall's window, frameless glass from wall to wall
  const wy0=by0+5,wy1=by0+(by1-by0)*0.62;
  box(g,bx0+4,wy0,bx1-bx0-8,wy1-wy0,T.sky);
  box(g,bx0+4,wy0+(wy1-wy0)*0.62,bx1-bx0-8,(wy1-wy0)*0.38,T.town);
  for(let i=0;i<5;i++)box(g,bx0+10+i*(bx1-bx0-20)/5,wy0+(wy1-wy0)*(0.35+0.1*(i%3)),(bx1-bx0)/9,(wy1-wy0)*(0.65-0.1*(i%3)),f.floor==='exec'?'#4a405c':'#9fb1c4');
  for(let u=bx0+4;u<=bx1-4;u+=(bx1-bx0-8)/4)line(g,u,wy0,u,wy1,f.floor==='exec'?'#2a2236':'#8d97a6',0.7);
  line(g,bx0+4,wy1,bx1-4,wy1,f.floor==='exec'?'#2a2236':'#8d97a6',1.2);
  poly(g,[x0,top,x1,top,bx1,by0,bx0,by0],T.ceil,P.ink,0.4);
  for(const u of [0.3,0.7]){const lx=bx0+(bx1-bx0)*u;poly(g,[lx-14,by0-3,lx+14,by0-3,lx+11,by0-1,lx-11,by0-1],'#fffbe6');}
  poly(g,[x0,top,bx0,by0,bx0,by1,x0,bottom],T.lit,P.ink,0.4);
  poly(g,[x1,top,x1,bottom,bx1,by1,bx1,by0],T.dark,P.ink,0.4);
  poly(g,[x0,bottom,bx0,by1,bx1,by1,x1,bottom],T.floor,P.ink,0.4);
  for(let i=1;i<4;i++){const fy=by1+(bottom-by1)*i/4;line(g,x0+(bx0-x0)*(1-i/4),fy,x1-(x1-bx1)*(1-i/4),fy,T.floorLine,0.4);}
  g.save();
  g.beginPath();g.rect(x0,top,x1-x0,bottom-top);g.clip();
  g.translate(cx,by1+1);g.scale(k,k);g.translate(-cx,-MID_BASE);
  contents();
  g.restore();
  if(cool)box(g,x0,top,x1-x0,bottom-top,`rgba(70,110,150,${cool})`);
}
// how much nearer the glass box's front stands than the wall, as a perspective scale
const BOX_DEPTH=1.3;
// A whiteboard fixed to a wall, as wide as it is given: frame, surface, bold title and two lines,
// and a marker tray along the foot.
export function wallWhiteboard(g,x,y,w,h,P,{title,detail}){
  box(g,x+1.4,y+1.8,w,h,'rgba(40,36,50,0.18)');
  box(g,x,y,w,h,'#51505b',P.ink,0.8);
  box(g,x+3,y+3,w-6,h-6,'#fffef9',P.ink,0.3);
  const ts=Math.min(16,h*0.26),n=detail.length;
  whiteboardText(g,title,x+w/2,y+h*0.3,ts,w-24,'#202733',700);
  // two lines sit under the title at their full size; more close up to fit above the tray
  const step=n>2?Math.min(ts*0.85,h*0.42/n):ts*0.85,size=Math.min(ts*0.72,step*0.95),y0=n>2?y+h*0.5+step*0.55:y+h*0.58;
  for(let i=0;i<n;i++)whiteboardText(g,detail[i],x+w/2,y0+i*step,size,w-28,'#4a5360',600);
  box(g,x+w*0.2,y+h-1,w*0.6,3,'#7d8490',P.ink,0.4);
  for(const [u,col] of [[0.3,'#2f6fd0'],[0.36,'#e2483e'],[0.42,'#2a8a4a']])box(g,x+w*u,y+h-2.6,7,1.8,col);
}
export function roomWithDepth(g,l,f,P,style,contents,backWall=null){
  const {x,w}=l,top=f.ceilingY+officeBulkhead(f)+(MID_BASE-WALL_BASE),bottom=MID_BASE;
  const x0=x,x1=x+w;
  if(style==='recess'){
    interior(g,x0,x1,top,bottom,f,P,contents);
    glassFront(g,x0,x1,top,bottom);
    box(g,x0,top,w,2.2,P.frame||'#898594',P.ink,0.4);
  }else if(style==='box'||style==='boxfrost'||style==='boxdesk'){
    // A real box in the room's one-point perspective. Its back is the wall opening; its front is
    // the same rectangle a little nearer: scaled about the vanishing point by BOX_DEPTH, exactly
    // as the floor tiles are (line.js xOf/yOfF), so its feet stay on the floor and its front
    // slides at the speed of the floor beneath it. The people sit halfway in.
    const vy=YH+(MID_BASE-WALL_BASE);
    const at=(k)=>(px,py)=>[VPX+(px-VPX)*k,vy+(py-vy)*k];
    const F=at(BOX_DEPTH),M=at((1+BOX_DEPTH)/2);
    const [fx0,ft]=F(x0,top),[fx1,fb]=F(x1,bottom);
    const glassSide='rgba(200,232,240,0.28)',edge='rgba(235,250,252,0.45)';
    // the floor inside, the back wall glass, then the far side pane
    poly(g,[x0,bottom,x1,bottom,fx1,fb,fx0,fb],'rgba(150,170,190,0.28)');
    box(g,x0,top,w,bottom-top,'rgba(205,220,232,0.22)');
    if(backWall)backWall(top,bottom);
    const nearLeft=(x0+x1)/2>VPX; // the side facing the vanishing point is the one we look into
    // a side pane, and with B2 its frosting running round from the front. It was frosted from
    // the table top to the floor, which greyed out everyone's chair, legs and feet; since 15 Oct
    // 2026 it is a band at the table's height, clear glass below it (Peter: "want the bottom half
    // to read better, fix frosting").
    const frostY=bottom-24,FROST_BAND=4.5,[,ffy]=F(x0,frostY),[,ffy1]=F(x0,frostY+FROST_BAND);
    const FROST='rgba(244,247,251,0.6)';
    const side=(bx,fx)=>{
      poly(g,[bx,top,fx,ft,fx,fb,bx,bottom],glassSide);
      if(style==='boxfrost'){
        poly(g,[bx,frostY,fx,ffy,fx,ffy1,bx,frostY+FROST_BAND],FROST);
        line(g,bx,frostY,fx,ffy,'rgba(255,255,255,0.95)',0.8);
        line(g,bx,frostY+2.2,fx,ffy+2.2,'rgba(160,180,200,0.6)',0.5);
        line(g,bx,frostY+FROST_BAND,fx,ffy1,'rgba(160,180,200,0.6)',0.5);
      }
    };
    side(nearLeft?x1:x0,nearLeft?fx1:fx0);
    g.save();
    g.translate(VPX,vy);g.scale((1+BOX_DEPTH)/2,(1+BOX_DEPTH)/2);g.translate(-VPX,-vy);
    contents();
    if(style==='boxdesk'){
      const tx=x0+42,tw=w-84;
      box(g,tx+1,bottom-23.5,tw-2,19.5,f.floor==='exec'?'#5a4636':'#d9c193',P.ink,0.5);
    }
    g.restore();
    side(nearLeft?x0:x1,nearLeft?fx0:fx1);
    // zoomed out the ceiling rises clear of the box, and we see up into its glass lid from below
    const lid=officeRoomLidShows(f);
    if(lid>0){
      poly(g,[x0,top,x1,top,fx1,ft,fx0,ft],`rgba(200,232,240,${(0.3*lid).toFixed(3)})`);
      line(g,x0,top,x1,top,`rgba(235,250,252,${(0.35*lid).toFixed(3)})`,0.6);
    }
    // the edges where the panes meet: along the floor and ceiling, and up each corner
    for(const [bx,fx] of [[x0,fx0],[x1,fx1]]){line(g,bx,top,fx,ft,edge,0.6);line(g,bx,bottom,fx,fb,edge,0.6);}
    glassFront(g,fx0,fx1,ft,fb,{edge:'rgba(235,250,252,0.45)',edgeW:0.7});
    if(style==='boxfrost'){
      // the frosted band at the table's height, a crisp pinstripe along its top and a fine one
      // along its foot; clear glass below
      const fy=ffy;
      box(g,fx0,fy,fx1-fx0,ffy1-fy,FROST);
      line(g,fx0,fy,fx1,fy,'rgba(255,255,255,0.95)',0.8);
      line(g,fx0,fy+2.2,fx1,fy+2.2,'rgba(160,180,200,0.6)',0.5);
      line(g,fx0,ffy1,fx1,ffy1,'rgba(160,180,200,0.6)',0.5);
    }
    // at rest the front meets the ceiling in a slim track; as a free-standing cube it is frameless,
    // its top edge just the bright line where the panes meet
    if(lid<1){g.save();g.globalAlpha*=1-lid;box(g,fx0,ft-2.4,fx1-fx0,2.4,P.frame||'#898594',P.ink,0.4);g.restore();}
    if(lid>0)line(g,fx0,ft,fx1,ft,`rgba(235,250,252,${(0.45*lid).toFixed(3)})`,0.6);
    box(g,fx0,fb,fx1-fx0,1.4,'rgba(20,16,30,0.3)');
    // floor 23's interview room opens on its right, the side its people leave by when
    // office-2's alarm goes (Peter, 15 Oct); every other room keeps its door on the left
    if(l.kind==='interview'&&f.floor==='open'){g.save();g.translate(fx0+fx1,0);g.scale(-1,1);glassDoor(g,fx0,ft,fb);g.restore();}
    else glassDoor(g,fx0,ft,fb);
  }else if(style==='frosted'){
    interior(g,x0,x1,top,bottom,f,P,contents,{cool:0.1});
    glassFront(g,x0,x1,top,bottom,{tint:'rgba(200,230,240,0.1)'});
    // the frosted band at seated eye level, with a pinstripe either side
    const fy=bottom-30;
    box(g,x0,fy,w,13,'rgba(246,248,252,0.72)');
    line(g,x0,fy-1.5,x1,fy-1.5,'rgba(246,248,252,0.8)',0.6);
    line(g,x0,fy+14.5,x1,fy+14.5,'rgba(246,248,252,0.8)',0.6);
    box(g,x0,top,w,2.2,P.frame||'#898594',P.ink,0.4);
  }else{
    // partition: an opening with a deep reveal into the recessed room, and a door
    const T=ROOM_TONES[f.floor]||ROOM_TONES.open,wallC=f.floor==='exec'?'#3a2f48':'#e6e0ea';
    const door=34,ox0=x0+12,ox1=x1-door-22,oy0=top+12,oy1=bottom-16;
    box(g,x0,top,w,bottom-top,wallC,P.ink,0.6);
    g.save();g.beginPath();g.rect(ox0,oy0,ox1-ox0,oy1-oy0);g.clip();
    interior(g,ox0-20,ox1+20,oy0-12,bottom,f,P,contents,{inset:18,floorH:8,k:0.86});
    g.restore();
    // the reveal: the thickness of the wall round the opening
    poly(g,[ox0,oy0,ox1,oy0,ox1-4,oy0+4,ox0+4,oy0+4],T.dark);
    poly(g,[ox0,oy0,ox0+4,oy0+4,ox0+4,oy1,ox0,oy1],T.lit);
    box(g,ox0,oy1,ox1-ox0,3,'#cfc7d8',P.ink,0.5);
    box(g,ox0,oy0,ox1-ox0,oy1-oy0,null,P.ink,0.6);
    glassFront(g,ox0+4,ox1,oy0+4,oy1,{edges:false});
    // the door, a vision strip and a handle
    const dx=x1-door-12;
    box(g,dx,top+30,door,bottom-top-30,f.floor==='exec'?'#5a4636':'#b9a58a',P.ink,0.6);
    box(g,dx+door/2-3,top+38,6,30,'rgba(190,225,236,0.6)',P.ink,0.4);
    box(g,dx+4,top+80,2.4,10,'#d6d9df',P.ink,0.3);
    box(g,x0,bottom-5,w,5,f.floor==='exec'?'#271f35':'#cbc3d5',P.ink,0.4);
  }
}

// The people at the canteen and coffee-shop tables, sat in a diner booth (diners.js), with their
// table and the food. The diner bake-off (src/dev/office-diner-candidates.js) swaps the painter.
const defaultDiners=selectedLunchPeople;
let DINERS=defaultDiners;
export function setOfficeDiners(fn){const was=DINERS;DINERS=fn||defaultDiners;return was;}
// Whoever works the coffee-shop counter (barista.js). Two passes: 'back' stands behind the espresso
// machine and the counter front, 'front' adds what sits on or over the counter top. The barista
// bake-off (src/dev/office-barista-candidates.js) swaps the painter.
let BARISTA=frothingBarista;
export function setOfficeBarista(fn){const was=BARISTA;BARISTA=fn||frothingBarista;return was;}

export function paintExtraOfficeRoom(g,l,f,P){
  const {x,w,kind}=l,c=x+w/2,b=MID_BASE;
  if(kind==='canteen'){
    // A small staff kitchen let into the wall: a tiled serving hatch and one table.
    caption(g,'STAFF CANTEEN',x+8,OFFICE_SIGN_MIN_Y,w-16,P);
    const kitchen=x+w-106;
    // The counter top stands at a kitchen counter's height, a little over the tables' (it was 56
    // up, over the diners' heads: Peter, 15 Oct 2026, "the counter for the microwave etc is super
    // high"); the tiles and everything on it sit D lower than they were drawn.
    const top=b-33,D=top-157;
    // the tiled splashback, a few rows over the machines (lowered with the sign over it: Peter,
    // "maybe lower the splash back so the sign can sit lower")
    const splash=top-40;
    box(g,kitchen,splash,94,top+3-splash,'#cde2d5',P.ink,0.7);
    for(let yy=splash+10;yy<top;yy+=11)line(g,kitchen,yy,kitchen+94,yy,'#90b4aa',0.45);
    for(let xx=kitchen+11;xx<kitchen+94;xx+=11)line(g,xx,splash,xx,top+3,'#90b4aa',0.45);
    box(g,kitchen-3,top+3,100,b-top-3,'#7eb5ab',P.ink,0.7);
    line(g,kitchen+47,top+8,kitchen+47,b-3,P.ink,0.5);
    box(g,kitchen-5,top,104,5,'#eee1be',P.ink,0.6);
    // Microwave, coffee machine and a quietly steaming mug.
    box(g,kitchen+45,130+D,44,26,'#ebe8d6',P.ink,0.7);
    box(g,kitchen+49,134+D,29,18,'#393745',P.ink,0.5);
    circ(g,kitchen+84,139+D,2,'#e6acbd',P.ink,0.4);
    box(g,kitchen+8,126+D,25,31,'#49404b',P.ink,0.6);
    box(g,kitchen+12,130+D,17,8,'#b7dccc',P.ink,0.4);
    box(g,kitchen+18,149+D,8,7,'#f3d994',P.ink,0.4);
    for(let i=0;i<2;i++)line(g,kitchen+20+i*3,146+D,kitchen+20+i*3+Math.sin(f.t*1.3+i),142+D,'#f5eee3',0.65);
    // The lunch notice hangs over the serving hatch, the wall over the one table of two kept bare
    // for the zombie creeping up on it (Peter, 15 Oct 2026: "Don't have a sign near the purple
    // clerk, it is distracting from him").
    const tx=x+10,people=[tx+18,tx+56],nx=kitchen+8,ny=splash-40;
    box(g,nx,ny,78,34,'#f4ecd2',P.ink,0.6);
    letters(g,'TODAY:',nx+39,ny+12.5,6,{ink:P.ink,lw:0.7,align:'center'});
    letters(g,'EGG AGAIN',nx+39,ny+27,8.5,{ink:P.ink,lw:0.9,align:'center'});
    DINERS(g,{room:'canteen',x:tx,w:76,xs:people,seed:30,span:[x+8,kitchen-5]},f,P);
    // and one of the crypt's zombies in a purple suit, left of the two at lunch, creeping toward
    // them as the canteen goes by, and stopping well short of their booth (zombies.js)
    if(f.floor==='open'){
      const right=f.coverage?.right??480,left=f.coverage?.left??0;
      paintCanteenZombieSide(g,x-44,tx-26,(right-x)/(right-left+w),f.t,P.inkM);
    }
    return true;
  }
  if(kind==='meeting'||kind==='interview'||kind==='training'){
    const training=kind==='training',interview=kind==='interview',executive=kind==='meeting'&&f.floor==='exec';
    const upperMeeting=kind==='meeting'&&f.floor!=='lobby';
    if(OFFICE_ROOM_STYLE!=='glass'){
      const o={training,interview,executive,upperMeeting,c,b};
      roomWithDepth(g,l,f,P,OFFICE_ROOM_STYLE,()=>meetingPeople(g,l,f,P,o),(top,bottom)=>{
        // the whiteboard is fixed to the back wall and fills it, above the heads
        const by=Math.max(top+8,OFFICE_SIGN_MIN_Y+2);
        wallWhiteboard(g,x+14,by,w-28,Math.min(bottom-by-50,92),P,boardText(f,o));
      });
      return true;
    }

    if(training)caption(g,'MANDATORY TRAINING',c-111,OFFICE_SIGN_MIN_Y,222,P);
    if(!training){
      const boardW=144;
      standingWhiteboard(g,c+w/2-boardW-14,95,P,boardText(f,{training,interview,executive}));
    }
    if(training&&!upperMeeting){
      box(g,c-43,39,86,9,'#dedee3',P.ink,0.5);
      poly(g,[c-4,49,c+4,49,c+76,149,c-76,149],'rgba(255,242,197,0.12)');
      letters(g,'HOW TO LOOK BUSY',c,107,7,{ink:'#514f63',lw:0.9,align:'center'});
      letters(g,'ATTENDANCE IS THE GOAL',c,122,4.5,{ink:'#71627d',lw:0.45,align:'center'});
      for(let i=0;i<3;i++){
        box(g,x+66+i*66,134-i*3,32,8+i*3,['#d9a9be','#91bbb8','#b8a8d3'][i],P.ink,0.4);
      }
    }
    meetingPeople(g,l,f,P,{training,interview,c,b});
    glassMeetingRoom(g,l,f,P);
    return true;
  }
  if(kind==='cafe'){
    caption(g,'COFFEE SHOP',c-111,OFFICE_SIGN_MIN_Y,222,P);
    // Visitor seating beside an espresso counter, rather than staff mail slots.
    // The counter top stands 39 up, about 1.05 m: level with the booths' backs, so the seated
    // diners and the barista standing behind it share one scale. (It was 53, about 1.4 m.)
    const kitchen=x+w-122,ct=b-39;
    box(g,kitchen,98,91,ct-4-98,'#cde2d5',P.ink,0.7);
    // the menu board: what the counter sells, prices, and the egg
    const mx=kitchen+5,mw=81;
    box(g,mx,101,mw,41,'#302c40',P.chrome,0.5);
    letters(g,'COFFEE / TEA / CAKE',mx+mw/2,110,3.8,{ink:'#f6e9d3',lw:0.5,align:'center'});
    line(g,mx+6,113.4,mx+mw-6,113.4,'rgba(246,233,211,0.4)',0.5);
    [['ESPRESSO','1.25'],['CAPPUCCINO','1.75'],['CAKE','1.95'],['EGG','MARKET PRICE']].forEach(([item,price],i)=>{
      const y=120+i*6;
      letters(g,item,mx+7,y,2.9,{ink:'#f6e9d3',lw:0.4});
      letters(g,price,mx+mw-7,y,2.9,{ink:i===3?'#f3d994':'#f6e9d3',lw:0.4,align:'right'});
    });
    const bar={kitchen,top:ct};
    if(BARISTA)BARISTA(g,bar,f,P,'back');
    box(g,kitchen+9,ct-28,48,28,'#b9c6cc',P.ink,0.7);
    box(g,kitchen+13,ct-23,40,10,'#49404b',P.ink,0.5);
    for(const dx of [19,39]){
      line(g,kitchen+dx,ct-13,kitchen+dx,ct-7,P.chrome,1);
      box(g,kitchen+dx-3,ct-7,7,7,'#f4ecd2',P.ink,0.4);
      const steam=Math.sin(f.t*1.3+dx)*1.2;
      line(g,kitchen+dx,ct-28,kitchen+dx+steam,ct-32,'#f5eee3',0.65);
    }
    box(g,kitchen-4,ct+4,99,b-ct-4,'#9b7560',P.ink,0.7);
    box(g,kitchen-7,ct,105,5,'#eee1be',P.ink,0.6);
    // biscuits on the counter top
    for(let i=0;i<3;i++){
      ell(g,kitchen+66+i*7,ct-1,4,1.4,'#d8ac71',P.ink,0.4);
    }
    if(BARISTA)BARISTA(g,bar,f,P,'front');
    DINERS(g,{room:'cafe',x:x+35,w:112,xs:[x+58,x+124],seed:70,span:[x+8,kitchen-7]},f,P);
    return true;
  }
  if(kind==='lounge'){
    if(f.floor==='lobby'){
      // A simple visitor waiting area: seats, a low table and a plant.
      sofa(g,{x:x+25,w:82,tone:1},P,false);
      sofa(g,{x:x+w-97,w:30,seat:'single',tone:2},P,false);
      sofa(g,{x:x+w-55,w:30,seat:'single',tone:0},P,false);
      const tableY=MID_BASE-12;
      box(g,c-27,tableY,54,3,'#c5b995',P.ink,0.5);
      line(g,c-20,tableY+3,c-23,MID_BASE-1,P.ink,0.6);
      line(g,c+20,tableY+3,c+23,MID_BASE-1,P.ink,0.6);
      plant(g,x+w/2-7,MID_BASE,'palm',P,8);
      return true;
    }
    caption(g,'EXECUTIVE RECHARGING',c-109,OFFICE_SIGN_MIN_Y,218,P);
    box(g,c-53,90,106,48,'#211b32',P.brass,1);
    poly(g,[c-45,131,c-18,98,c+12,131],'#a789bd',P.ink,0.6);
    circ(g,c+25,107,10,'#efb784',P.ink,0.5);
    gagNote(g,'BREAKS ARE FOR MANAGEMENT',c-78,145,156,P);
    sofa(g,{x:x+35,w:85},P,true);sofa(g,{x:x+w-120,w:85},P,true);
    table(g,c-36,72,P);
    box(g,c-18,b-31,27,3,'#f4e8ce',P.ink,0.4);
    libGlobe(g,{x:x+131},P);
    plant(g,x+w-41,b,'palm',P,81);
    return true;
  }
  return false;
}
