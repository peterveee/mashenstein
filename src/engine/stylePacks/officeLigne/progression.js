// Ordinary architecture repeats; named rooms are finite, stage-relative places.
import { OFFICE_FLOORS, FACTORS, OFFICE_ZOOM, WALL_BASE, MID_BASE, LANE_TOP } from '../officeClimb.js';
import { box, line, poly, circ, ell, letters, OFFICE_FONT, PAL, YH, VPX, canvas } from './line.js';
import { ceoDoor, founderPortrait, trophyCase, bookshelf, lobbyLogo, signNeon, lobbyWallBay, openWallBay, execPanels, lobbyLift, steelLift, liftDoors } from './wall.js';
import { reception, midActors, plant, sculpture, boardroomBack, boardroomFront, easel, chairFromBehind } from './room.js';
import { glassMeetingRoom, paintExtraOfficeRoom, officeRoomStyle, roomWithDepth } from './rooms.js';
import { PROFESSOR_PLAN } from './professorArt.js';

// Furniture must travel with the floor directly under its feet. The furniture and the workers are
// the mid level: they stand OFFICE_FURNITURE_DROP px further back up the floor plane than the card
// drew them (213). The deeper wall perspective and feet at 208 slow the production
// row to 0.28, without letting furniture or workers skate on the floor.
export const OFFICE_FURNITURE_BASE=208;
export const OFFICE_FURNITURE_DROP=MID_BASE-OFFICE_FURNITURE_BASE;
const ROOM_FACTOR=(OFFICE_FURNITURE_BASE-YH)/(LANE_TOP-YH);
// The distant street goes slower too, by the same sixth.
const OUTSIDE_SLOWER=0.83;
// Floor 88's glass stops on a panelled sill, so no strip of tiny city windows shows at floor
// level; the lobby's glass runs to the floor, over the street and its traffic.
const OFFICE_SILL={exec:168};
// Floor 88's glass starts under the cornice tube, which runs on unbroken over wall and window.
const OFFICE_GLASS_TOP={exec:38};
export const OFFICE_CORRIDORS = Object.fromEntries(Object.entries(OFFICE_FLOORS).map(([id,F])=>[id,{
  ...F,
  glass:{...F.glass,top:OFFICE_GLASS_TOP[id]??F.glass.top,bottom:OFFICE_SILL[id]??F.glass.bottom},
  wall:{...F.wall,
    factor:FACTORS.wall,
    bays:F.wall.bays.map(b=>({...b,revolvingDoor:null})),
    // Generic clocks, posters and equipment belong along a corridor. A named
    // doorway, company crest, founder portrait or trophy collection does not.
    // Remove the repeated wall lifts too; the compact foreground lifts below
    // replace them so no second set appears behind the doors.
    // The lobby clock moves to the end of its bay, leaving the middle for a picture.
    hangs:F.wall.hangs.filter(h=>['clock','poster','whiteboard','extinguisher'].includes(h.kind))
      .map(h=>id==='lobby'&&h.kind==='clock'?{...h,u:612}:h),
    cradle:null,
  },
  outside:{...F.outside,nearFactor:(F.outside.nearFactor??FACTORS.cityNear)*OUTSIDE_SLOWER},
  mid:{...F.mid,factor:ROOM_FACTOR,items:F.mid.items.filter(it=>['plant','sofa','cubicles','cooler','copier','cabinet'].includes(it.kind))},
}]));

// Meeting-room fronts and the archive use the corridor-furniture plane.
// Compact lifts sit further forward; built-ins stay at the wall plane.
export const OFFICE_LANDMARK_BASE=OFFICE_FURNITURE_BASE;
export const OFFICE_LANDMARK_DROP=MID_BASE-OFFICE_LANDMARK_BASE;
export const OFFICE_LANDMARK_FACTOR=(OFFICE_LANDMARK_BASE-YH)/(LANE_TOP-YH);
export const OFFICE_LANDMARK_RATE=OFFICE_LANDMARK_FACTOR*OFFICE_ZOOM;
// Three depths, and nothing in between:
// - Wall sections (reception, coffee shop, canteen, ...) are part of the back wall. Each one
//   takes over whole window bays, column to column, so it never lies across a window, a
//   picture or the clock, and it scrolls exactly with the wall.
// - Meeting rooms, presentation rooms and lift bays are on the wall too, drawn standing a
//   little proud of it (standOut); the lobby's waiting area stands on the furniture line.
// Corridor furniture is kept clear of every one of them in the furniture's own coordinates
// (officeFurnitureCuts), so nothing ever appears to move behind a lift or a room.
const OFFICE_FORWARD_LANDMARKS=new Set(['meeting','interview','training','boardroom']);
const OFFICE_NEAR_LIFT_LANDMARKS=new Set(['lobbyLifts','operations','lift']);
const OFFICE_BACK_LANDMARKS=new Set(['canteen']);
const OFFICE_WALL_SECTIONS=new Set(['entrance','reception','cafe','canteen','library','secretary','ceo','lounge']);
export function officeIsWallSection(floor,kind){
  return OFFICE_WALL_SECTIONS.has(kind)&&!(floor==='lobby'&&kind==='lounge');
}
export function officeIsRoomGroup(floor,kind){
  return OFFICE_FORWARD_LANDMARKS.has(kind)||(floor==='lobby'&&kind==='lounge');
}
// Meeting rooms, presentation rooms and lift bays hang on the wall itself and scroll with it;
// standOut() only makes them look a little forward of it.
function officeLandmarkBase(floor,kind){
  return floor==='lobby'&&kind==='lounge'?OFFICE_LANDMARK_BASE:WALL_BASE;
}
export function officeStandsOut(kind){
  return OFFICE_FORWARD_LANDMARKS.has(kind)||OFFICE_NEAR_LIFT_LANDMARKS.has(kind);
}
// A shallow return on the side facing the vanishing point and a contact shadow at the foot:
// the look of a box standing a little proud of the wall, while it moves exactly with it.
const OFFICE_STAND_OUT=0.05;
function standOut(g,l,top,bottom,side,drop){
  const vy=YH+drop,k=1-Math.min(OFFICE_STAND_OUT,8/Math.max(1,Math.abs((l.x+l.w<VPX?l.x+l.w:l.x)-VPX)));
  const back=(x,y)=>[VPX+(x-VPX)*k,vy+(y-vy)*k];
  const edge=l.x+l.w<VPX?l.x+l.w:l.x>VPX?l.x:null;
  if(edge!=null){
    const [bx0,by0]=back(edge,top),[bx1,by1]=back(edge,bottom);
    poly(g,[edge,top,bx0,by0,bx1,by1,edge,bottom],side,'#1f1d26',0.6);
  }
  box(g,l.x,bottom,l.w,2,'rgba(20,16,30,0.18)');
}
// Rooms and lifts start under the wall's own ceiling trim, so that trim runs on unbroken above them.
const OFFICE_BULKHEAD={lobby:8,open:14,exec:8};
function officeUnderBulkhead(f){
  return f.ceilingY+(OFFICE_BULKHEAD[f.floor]??8);
}
function officeLandmarkRate(floor,kind){
  const base=officeLandmarkBase(floor,kind);
  return ((base-YH)/(LANE_TOP-YH))*OFFICE_ZOOM;
}
// The lift block's width: the pair of 1.2x lifts with their surrounds and the call panel.
const LIFT_BAY=136;
export const OFFICE_ITINERARIES={
  // Ground floor serves visitors; staff facilities belong above reception.
  // In through the revolving door, past reception, to the lifts; then the visitors' lobby.
  lobby:[['entrance',0.03,230],['reception',0.11,340],['lobbyLifts',0.2,LIFT_BAY],
    ['cafe',0.45,280],['lounge',0.78,280]],
  open:[['lift',0.02,LIFT_BAY],['training',0.23,270],['meeting',0.40,270],
    ['lift',0.50,LIFT_BAY],['canteen',0.59,210],['interview',0.78,270]],
  exec:[['lift',0.04,LIFT_BAY],['meeting',0.12,270],['boardroom',0.32,360],['lounge',0.52,320],
    ['lift',0.62,LIFT_BAY],['library',0.72,270],['secretary',0.82,160],['ceo',0.94,400]],
};
// A wall section's span: the window bay nearest its itinerary place, in the wall's absolute
// coordinates (screen x = u - wall shift). Two sections never share a bay.
const PLACE_CACHE=new Map();
function officePlaces(floor,totalDist){
  const key=`${floor}|${totalDist}`;
  let places=PLACE_CACHE.get(key);
  if(places)return places;
  const def=OFFICE_CORRIDORS[floor].wall,per=def.period;
  const bays=def.bays.map((b,i)=>({...b,i})).filter(b=>b.type==='glass');
  const used=[];
  let lastX=-Infinity;
  places=OFFICE_ITINERARIES[floor].map(([kind,at,w])=>{
    const rate=officeLandmarkRate(floor,kind);
    let worldX=totalDist*at;
    let section=null;
    // Built-ins, rooms and lifts all take their own stretch of the wall: a window bay,
    // cleared to plain wall, so nothing hangs or shows through behind them.
    if(officeIsWallSection(floor,kind)||officeStandsOut(kind)){
      const centre=112+worldX*rate;
      let best=null;
      for(let j=Math.floor(centre/per)-2;j<=Math.floor(centre/per)+2;j++)for(const b of bays){
        const u0=b.u+j*per,u1=b.u1+j*per;
        if(used.some(([a,c])=>u1>a&&u0<c))continue;
        // never pushed past the finish line, nor back past the place before it
        const placed=((u0+u1)/2-112)/rate;
        if(placed>totalDist*0.97||placed<=lastX)continue;
        const d=Math.abs((u0+u1)/2-centre);
        if(!best||d<best.d)best={u0,u1,d};
      }
      if(best){
        used.push([best.u0,best.u1]);
        // The whole window run becomes plain wall, so no window, sill or radiator is ever cut
        // part-way; the place itself sits in the middle of it.
        const {u0,u1}=best;
        // the entrance keeps its glass: the revolving door stands in the curtain wall
        section=kind==='entrance'?{u0,u1,glass:true}:{u0,u1};
        w=Math.min(w,u1-u0);
        worldX=((u0+u1)/2-112)/rate;
      }else worldX=Math.max(worldX,lastX+1); // a stage too short to clear a bay for it
    }
    lastX=worldX;
    return {kind,at,w,rate,worldX,section};
  });
  if(PLACE_CACHE.size>12)PLACE_CACHE.clear();
  PLACE_CACHE.set(key,places);
  return places;
}
export function officeLandmarks(floor,camX,totalDist){
  // Recording and endless modes have no finish. Their ordinary corridors stay
  // available without manufacturing a repeating destination.
  if(!Number.isFinite(totalDist)||totalDist<=0)return [];
  return officePlaces(floor,totalDist).map(({kind,at,w,rate,worldX,section})=>
    ({kind,at,w,rate,worldX,section,x:112+(worldX-camX)*rate-w/2}));
}

// Corridor furniture sits behind the named room facades in the painter. Keep it out from under
// the room currently crossing the screen, while leaving the rest of the repeating corridor alive.
// The founder's pictures for one stage: each of the floor's pieces once, at its fraction of the
// way along (professorArt.js), in the wall's own absolute coordinates, and the spans the named
// rooms cover, which no picture may hang under. Endless runs have no length, so no plan.
const PLAN_CACHE=new Map();
// The window run the hero passes just before the finish line, cleared
// to plain wall for the founder (lobby and floor 23 only), clear of every other section.
// (screen x at the moment of finishing: the hero stands at 112, so the portrait is passed just
// before the line, in full view on the run up to it)
// how far the lift block stands out of the wall, as a perspective scale (rooms' glass box: 1.3)
const LIFT_DEPTH=1.18;
const OFFICE_FINISH_FOUNDER=new Set(['lobby','open']),OFFICE_FINISH_SCREEN_X=40,OFFICE_FINISH_CLEAR=420;
export function officeFinishWall(floor,totalDist){
  if(!OFFICE_FINISH_FOUNDER.has(floor)||!Number.isFinite(totalDist)||totalDist<=0)return null;
  const def=OFFICE_CORRIDORS[floor].wall,per=def.period;
  const target=totalDist*FACTORS.wall*OFFICE_ZOOM+OFFICE_FINISH_SCREEN_X;
  const used=officePlaces(floor,totalDist).filter(p=>p.section).map(p=>[p.section.u0,p.section.u1]);
  let best=null;
  for(let j=Math.floor(target/per)-1;j<=Math.floor(target/per)+1;j++)for(const b of def.bays){
    // any stretch at least as wide as a piece and its margins: a window run is cleared to wall
    if(b.u1-b.u<110)continue;
    const u0=b.u+j*per,u1=b.u1+j*per;
    if(used.some(([a,c])=>u1>a&&u0<c))continue;
    const d=Math.abs((u0+u1)/2-target);
    if(!best||d<best.d)best={u0,u1,d};
  }
  return best&&{u0:best.u0,u1:best.u1,abs:(best.u0+best.u1)/2};
}
export function officeFounderPlan(floor,totalDist){
  if(!Number.isFinite(totalDist)||totalDist<=0)return null;
  const key=`${floor}|${Math.round(totalDist)}`;
  let plan=PLAN_CACHE.get(key);
  if(!plan){
    const wallRate=FACTORS.wall*OFFICE_ZOOM,finish=officeFinishWall(floor,totalDist);
    plan={
      totalDist,
      entries:PROFESSOR_PLAN[floor].slice(0,finish?-1:undefined).map(([id,at])=>({id,abs:totalDist*at*wallRate})),
      // on the lobby and floor 23 the last piece hangs alone on a stretch of wall in full view
      // of the finish line
      finish:finish&&{...finish,id:PROFESSOR_PLAN[floor].at(-1)[0]},
      // and nothing else hangs anywhere near it
      // the wall that sections, rooms and lifts cover (at camera 0 screen x is wall x)
      avoid:officeLandmarks(floor,0,totalDist).filter(l=>l.section||officeStandsOut(l.kind))
        // the CEO suite has the founder's own portrait: no other picture beside it
        // (a room or lift covers only its own front, and a lift its pot plants)
        .map(l=>OFFICE_NEAR_LIFT_LANDMARKS.has(l.kind)?[l.x-42,l.x+l.w+58]:officeStandsOut(l.kind)?[l.x-14,l.x+l.w+14]
          :[l.section.u0-(l.kind==='ceo'?130:0),l.section.u1+(l.kind==='ceo'?130:0)])
        .concat(finish?[[finish.u0-OFFICE_FINISH_CLEAR,finish.u1+OFFICE_FINISH_CLEAR]]:[]),
      // each cleared window run and the part of it its place actually covers (a lift with its
      // pot plants, a room's front, or all of a built-in)
      walls:officeLandmarks(floor,0,totalDist).filter(l=>l.section).map(l=>({u0:l.section.u0,u1:l.section.u1,
        occ:OFFICE_NEAR_LIFT_LANDMARKS.has(l.kind)?[l.x-42,l.x+l.w+58]
          :officeStandsOut(l.kind)?[l.x-4,l.x+l.w+4]:[l.section.u0,l.section.u1]})),
      // the lift lobbies, where the founder's pictures like to hang
      lifts:officeLandmarks(floor,0,totalDist).filter(l=>l.section&&OFFICE_NEAR_LIFT_LANDMARKS.has(l.kind))
        .map(l=>[l.section.u0,l.section.u1]),
      assigned:null,
    };
    if(PLAN_CACHE.size>12)PLAN_CACHE.clear();
    PLAN_CACHE.set(key,plan);
  }
  return plan;
}

// What a corridor item covers on screen, from its left x (and its width, if it has one).
const OFFICE_ITEM_REACH={plant:[-14,54],sofa:[-8,8],cooler:[-4,22],copier:[-10,4],cabinet:[-4,24],cubicles:[-12,12]};
export function officeFurnitureExtent(m){
  const [a,b]=OFFICE_ITEM_REACH[m.kind]||[-35,40];
  const left=m.x0??m.x;
  const right=m.x1??(m.x+(m.w||0));
  return [left+a,right+b];
}
const OFFICE_CLEAR_PAD=10;
export const OFFICE_CLEAR_VIEW=[120,360];
// Corridor furniture moves at its own parallax rate, so a cut made in screen space would slide
// across it and pop pieces in and out. Instead the cut is fixed in the furniture's own absolute
// coordinates (screen x + mid shift): every whole piece that would ever be seen across a room,
// lift or wall section while it is on screen is simply never there.
export function officeFurnitureCuts(f,landmarks){
  const F=OFFICE_CORRIDORS[f.floor]||OFFICE_FLOORS[f.floor];
  if(!F||!landmarks?.length)return [];
  const per=F.mid.period,shift=f.mid.shift,rF=(F.mid.factor??FACTORS.mid)*OFFICE_ZOOM;
  // Everything is on the wall now, so furniture passing in front of a place is honest
  // parallax; it is only kept clear while the place crosses the middle of the view.
  const covL=OFFICE_CLEAR_VIEW[0],covR=OFFICE_CLEAR_VIEW[1];
  const zones=[];
  for(const l of landmarks){
    if(!Number.isFinite(l.x))continue;
    // the cameras at which the landmark's left edge is at the right of the view, and its
    // right edge at the left; in between, the furniture under it is a straight-line sweep
    const camIn=l.worldX-(covR+l.w/2-112)/l.rate,camOut=l.worldX-(covL-l.w/2-112)/l.rate;
    const left=cam=>112+(l.worldX-cam)*l.rate-l.w/2+cam*rF;
    const a=Math.min(left(camIn),left(camOut)),b=Math.max(left(camIn),left(camOut))+l.w;
    // only the places whose clear zone can reach the view this frame
    if(b+OFFICE_CLEAR_PAD-shift<f.coverage.left-400||a-OFFICE_CLEAR_PAD-shift>f.coverage.right+400)continue;
    zones.push([a-OFFICE_CLEAR_PAD,b+OFFICE_CLEAR_PAD]);
  }
  if(!zones.length)return [];
  // every piece instance near the zones, in absolute furniture coordinates
  const lo=Math.min(...zones.map(z=>z[0]))-400,hi=Math.max(...zones.map(z=>z[1]))+400;
  const pieces=[];
  for(let j=Math.floor(lo/per)-1;j<=Math.floor(hi/per)+1;j++)for(const it of F.mid.items){
    const m=it.kind==='cubicles'?{kind:it.kind,x0:it.u+j*per,x1:it.u1+j*per}:{kind:it.kind,x:it.u+j*per,w:it.w??0};
    const [x0,x1]=officeFurnitureExtent(m);
    if(x1>=lo&&x0<=hi)pieces.push([x0,x1]);
  }
  // a piece goes if it overlaps a zone, or overlaps a piece that goes, so none is sliced
  const out=[...zones];
  const gone=new Set();
  for(let changed=true;changed;){
    changed=false;
    pieces.forEach((p,i)=>{
      if(gone.has(i))return;
      if(out.some(([a,b])=>p[1]>a&&p[0]<b)){gone.add(i);out.push(p);changed=true;}
    });
  }
  const merged=[];
  for(const [a,b] of out.sort((x,y)=>x[0]-y[0])){
    const last=merged.at(-1);
    if(last&&a<=last[1])last[1]=Math.max(last[1],b);
    else merged.push([a,b]);
  }
  return merged.map(([a,b])=>[a-shift,b-shift]).filter(([a,b])=>b>f.coverage.left-64&&a<f.coverage.right+64);
}

function panelText(g,text,x,y,w,h,size,ink,track=0.3){
  g.save();
  g.font=`600 ${size*1.18}px ${OFFICE_FONT}`;
  if('letterSpacing' in g)g.letterSpacing=`${size*0.06+track*size/6}px`;
  const measured=g.measureText(text);
  const fit=Math.min(1,(w-12)/Math.max(1,measured.width));
  const actualSize=size*fit;
  g.font=`600 ${actualSize*1.18}px ${OFFICE_FONT}`;
  if('letterSpacing' in g)g.letterSpacing=`${actualSize*0.06+track*actualSize/6}px`;
  const metrics=g.measureText(text);
  const ascent=metrics.actualBoundingBoxAscent||actualSize;
  const descent=metrics.actualBoundingBoxDescent||actualSize*0.2;
  g.restore();
  letters(g,text,x+w/2,y+h/2+(ascent-descent)/2,actualSize,
    {ink,weight:600,lw:0.4,align:'center',track});
}
function plaque(g,text,x,y,w,P){
  box(g,x,y,w,14,'#23212f',P.brass||P.chrome,0.9);
  panelText(g,text,x,y,w,14,6,P.brass||'#f7ead0');
}
function gagNote(g,text,x,y,w,P){
  box(g,x,y,w,14,'#f4ecd2',P.ink,0.45);
  panelText(g,text,x,y,w,14,6,P.ink,0.4);
}
function pilaster(g,x,top,bottom,P){
  const gold=P.brass||'#d1bc78';
  box(g,x,top,16,bottom-top,P.column||'#e3d8e6',P.ink,0.8);
  for(let k=0;k<4;k++)line(g,x+3+k*3,top+9,x+3+k*3,bottom-8,gold,0.65);
  box(g,x-3,top,22,6,gold,P.ink,0.6);
  box(g,x-3,bottom-6,22,6,gold,P.ink,0.6);
}
function facade(g,l,f,P){
  // The caller chooses the depth; local geometry shares one convenient foot line.
  const {x,w}=l,glassRoom=['meeting','interview','training','boardroom'].includes(l.kind);
  // A meeting room is built against the wall: its cornice meets the ceiling and its glass
  // front stands on its own foot line, not out on the floor.
  const drop=MID_BASE-officeLandmarkBase(f.floor,l.kind);
  const top=glassRoom?officeUnderBulkhead(f)+drop:l.kind==='entrance'?f.ceilingY+4:50,b=MID_BASE;
  const backBottom=b;
  const ceremonial=['ceo','reception','entrance'].includes(l.kind);
  const wall=l.kind==='canteen'?'#e9e5c9':l.kind==='cafe'?'#c4cdd8':f.floor==='exec'?'#37293f':'#e9e0e8';
  // A glass room has no back wall of its own: the building's own windows show through it.
  if(!glassRoom)box(g,x,top,w,backBottom-top,wall,P.ink,0.9);
  if(!glassRoom){
    box(g,x+5,top+5,w-10,backBottom-top-10,null,P.brass||'#a699bb',0.7);
    box(g,x-4,top-8,w+8,8,P.ceilDk,P.ink,0.8);
    line(g,x-4,top-3,x+w+4,top-3,f.floor==='exec'?'#f4b9cf':'#8fd3ca',1.3);
  }
  if(ceremonial&&f.floor==='lobby'){
    for(const u of [x+6,x+w-22])pilaster(g,u,top+1,b,P);
  }else if(glassRoom){
    // Frameless glazing (rooms.js): only a slim ceiling track and the room's shadow on the floor.
    if(officeRoomStyle()==='glass'){
      box(g,x,top,w,2.2,P.frame||'#898594',P.ink,0.4);
      box(g,x,MID_BASE-1.2,w,1.2,'rgba(30,24,40,0.25)');
    }
  }else{
    // Glazed room partitions and a low coloured wall replace the grand portico.
    box(g,x+6,151,w-12,b-151,l.kind==='canteen'?'#b1d3bd':f.floor==='exec'?'#282235':'#b9cdd1');
    for(const u of [x+6,x+w-12])box(g,u,top+1,6,b-top-1,P.frame||'#898594',P.ink,0.5);
    line(g,x+12,151,x+w-12,151,P.chrome,1);
  }
  if(!glassRoom){
    // A shallow threshold stays behind the running lane.
    poly(g,[x,b,x+w,b,x+w+9,MID_BASE,x-9,MID_BASE],P.slab||'#aaa4bc',P.ink,0.6);
    line(g,x-9,MID_BASE,x+w+9,MID_BASE,P.brass||'#e4daca',1);
  }
}

// The lobby's revolving door, standing in the curtain wall: a glass drum under a plain steel
// canopy, four glass wings with steel rails turning on a steel post.
function revolvingEntrance(g,c,b,turn,P){
  // brushed steel, as in the LIGNE '89 bake-off
  const brass='#c9ced8',brassDk='#8e94a2',frame='#34313f';
  const R=30,top=96,y0=top+14,y1=b-3;
  // the curtain wall's glass and the street show through the drum
  ell(g,c,y1,R+2,3.4,'rgba(60,64,80,0.45)',P.ink,0.4);
  const wings=[0,1,2,3].map(q=>{const a=turn*Math.PI+q*Math.PI/2;return {x:Math.cos(a)*(R-1),z:Math.sin(a)};});
  // Each wing's shade follows how far round it has turned (z: +1 at the back, -1 at the front),
  // so the steel lightens and the glass clears smoothly instead of flipping as it passes the post.
  const steel=(t)=>{const k=(1-t)/2,m=(a,b)=>Math.round(a+(b-a)*k);return `rgb(${m(142,201)},${m(148,206)},${m(162,216)})`;};
  const wing=(wg)=>{
    const x1=c+wg.x,lo=Math.min(c,x1),wd=Math.abs(x1-c),near=(1-wg.z)/2,col=steel(wg.z);
    if(wd>0.6){
      box(g,lo,y0+2,wd,y1-y0-5,`rgba(${Math.round(200+30*near)},${Math.round(225+23*near)},${Math.round(235+17*near)},${(0.22+0.13*near).toFixed(3)})`);
      line(g,lo,y0+2,lo+wd,y0+2,col,1.2);
      box(g,lo,y1-9,wd,6,col);
      line(g,lo,(y0+y1)/2,lo+wd,(y0+y1)/2,col,1.4);
      if(wd>9&&near>0.5)line(g,lo+wd*0.3,y0+18,lo+wd*0.65,y0+44,`rgba(255,255,255,${(0.75*(near-0.5)*2).toFixed(3)})`,0.8);
    }
    line(g,x1,y0+1,x1,y1-2,col,2);
  };
  wings.sort((a,b)=>b.z-a.z);
  for(const wg of wings)if(wg.z>=0)wing(wg);
  box(g,c-1.6,y0,3.2,y1-y0,brassDk,P.ink,0.35);
  for(const wg of wings)if(wg.z<0)wing(wg);
  // the curved glass of the drum: a faint tint, bright edges, a soft sheen
  box(g,c-R,y0,R*2,y1-y0,'rgba(215,242,248,0.14)');
  for(const [u,a] of [[-R+3,0.75],[R-3,0.55],[-R*0.45,0.35]])line(g,c+u,y0+2,c+u,y1-4,`rgba(255,255,255,${a})`,1);
  line(g,c-R,y0,c-R,y1,frame,1.6);line(g,c+R,y0,c+R,y1,frame,1.6);
  // a plain steel canopy over the drum
  box(g,c-R-4,top,R*2+8,11,'#d3d7df',P.ink,0.6);
  line(g,c-R-4,top+9,c+R+4,top+9,'#9aa0ad',0.7);
}

// The 80s lift lobby's brushed-steel bin: a tall cylinder with a dark mouth near the top, a
// grille lid and a black foot ring. (Whether anyone stubs a cigarette out on it is their business.)
function ashtray(g,cx,P){
  const b=MID_BASE,w=11,h=30,x=cx-w/2;
  ell(g,cx,b-0.4,w*0.7,1.4,'rgba(20,16,30,0.25)');
  box(g,x,b-h,w,h-1.6,'#c3c8d1',P.ink,0.45);
  box(g,x+w*0.62,b-h,w*0.22,h-1.6,'#e4e8ee');
  box(g,x+1,b-h,w*0.16,h-1.6,'#9ca2ad');
  line(g,x+w*0.5,b-h+2,x+w*0.5,b-3,'#f3f5f8',0.4);
  box(g,x+1.2,b-h+5,w-2.4,5,'#1f1d26',P.ink,0.3);
  box(g,x-0.6,b-h-1.6,w+1.2,2,'#d5d9e0',P.ink,0.4);
  for(let k=0;k<4;k++)line(g,x+1.5+k*2.6,b-h-1.4,x+2.5+k*2.6,b-h+0.2,'#8b919c',0.3);
  box(g,x-0.4,b-1.8,w+0.8,1.8,'#1f1d26',P.ink,0.3);
}
function foregroundLift(g,l,P,floorNumber,ceilingY,open=0,floor='open'){
  // A narrow floor-to-ceiling wall bay makes the compact lift read as part of
  // the building. Its furniture cut matches the bay, so corridor props do not
  // show through the foreground structure.
  const {x,w}=l,c=x+w/2,left=c-33,top=108,bottom=MID_BASE;
  const wallTop=Math.max(0,ceilingY??34),wallHeight=bottom-wallTop;
  const wallSide=P.frame||P.columnDk||P.woodDk||'#55515f';
  const wallFace=P.wall||P.panel||P.partition||P.wood||'#c5c1cb';
  const wallTrim=P.wallShade||P.panelLt||P.partitionDk||P.woodLt||P.column||'#aaa5b5';
  box(g,x,wallTop,w,wallHeight,wallSide,P.ink,0.9);
  box(g,x+3,wallTop+3,w-6,wallHeight-6,wallFace,P.ink,0.45);
  box(g,x+8,wallTop+8,w-16,wallHeight-16,null,wallTrim,0.65);
  line(g,x+11,wallTop+10,x+11,bottom-9,wallTrim,0.55);
  line(g,x+w-11,wallTop+10,x+w-11,bottom-9,wallTrim,0.55);
  line(g,x+2,bottom-2,x+w-2,bottom-2,P.ink,0.8);

  // A bank of two lifts in the floor's own LIGNE '89 dress (wall.js: the lobby's lacquer
  // ziggurats with Memphis doors, floor 23's steel, floor 88's wood), drawn a fifth larger than
  // the wall-strip originals. The first stands open and closes as the hero arrives.
  const s=1.2,lw=36,lh=82;
  g.save();
  g.translate(c,bottom);g.scale(s,s);g.translate(-c,-WALL_BASE);
  const lifts=[{x:c-lw-10,open},{x:c+10,open:0}].map(q=>({kind:'lift',x:q.x,y:WALL_BASE-lh,w:lw,h:lh,label:String(floorNumber),open:q.open,buttons:false}));
  for(const h of lifts){
    if(floor==='lobby')lobbyLift(g,h,P);else steelLift(g,h,P,floor==='exec');
  }
  liftDoors(g,{floor,wall:{hangs:lifts}},P);
  // one call panel for the pair, on the wall between them
  const py=WALL_BASE-lh*0.54,plate=floor==='exec'?(P.brass||'#d1bc78'):floor==='lobby'?(P.chrome||'#d7dbe3'):(P.steelLt||'#e8ebf1');
  box(g,c-3.5,py,7,13,plate,P.ink,0.5);
  circ(g,c,py+3.6,1.3,floor==='lobby'?'#ff6fae':'#f6ecd0',P.ink,0.3);
  circ(g,c,py+9.2,1.3,floor==='lobby'?'#2fbcb0':'#f6ecd0',P.ink,0.3);
  g.restore();
}

// A built-in is the back wall itself: the floor's own solid wall bay painted over the window
// run it replaces.
// Painted once per floor, width and place on the wall's period, at the wall strip's own 4x
// detail, and drawn as an image: it moves and samples exactly like the strip around it.
const SECTION_SCALE=4,SECTION_CACHE=new Map();
function wallSectionCanvas(f,u0,span,top,P){
  const F=OFFICE_CORRIDORS[f.floor],per=F.wall.period,phase=((u0%per)+per)%per;
  const key=`${f.floor}|${phase}|${span}|${top}`;
  let c=SECTION_CACHE.get(key);
  if(c)return c;
  if(SECTION_CACHE.size>24)SECTION_CACHE.clear();
  const h=WALL_BASE-top+2;
  c=canvas((span+4)*SECTION_SCALE,h*SECTION_SCALE);
  const g=c.getContext('2d');
  g.scale(SECTION_SCALE,SECTION_SCALE);
  g.translate(2-phase,-top);
  const x0=phase,x1=phase+span;
  if(f.ceilingY<F.ceilingY)box(g,x0-2,top,span+4,F.ceilingY-top,P.wall||P.wood);
  // Painted wider and clipped a hair past the bay, so it has no outline of its own at the
  // joins and covers the window frame's last edge: one continuous wall. Every repeating trim
  // keeps its phase in the wall's own coordinates, so it meets its neighbours exactly.
  g.beginPath();
  g.rect(x0-1.5,top,span+3,WALL_BASE-top);
  g.clip();
  if(f.floor==='lobby')lobbyWallBay(g,x0-24,x1+24,P);
  else if(f.floor==='open')openWallBay(g,x0-24,x1+24,P,F);
  else execPanels(g,x0,x1,P,F);
  SECTION_CACHE.set(key,c);
  return c;
}
function wallSection(g,l,f,P){
  const F=OFFICE_CORRIDORS[f.floor],span=l.section.u1-l.section.u0,x0=l.x+l.w/2-span/2;
  const top=Math.floor(Math.min(f.ceilingY,F.ceilingY));
  const c=wallSectionCanvas(f,l.section.u0,span,top,P);
  g.drawImage(c,x0-2,top,span+4,WALL_BASE-top+2);
}

// The executive suite stands out of the wall as a solid block, as far as the meeting-room boxes:
// its front is the suite's panelled wall scaled about the vanishing point by CEO_DEPTH, with the
// side wall that faces us joining it to the wall. Floor to ceiling, like the lifts. Leaves the
// front's transform in place for the suite's contents.
const CEO_DEPTH=1.3;
// The boss gets no office wainscot: black lacquer veined in gold, a brass Deco cornice stepped
// over the middle, fluted gold pilasters at the corners and a polished black marble plinth.
function bossFacade(g,x0,x1,top,bot){
  const gold='#d7b975',goldDk='#927041',goldLt='#ffe9b0',w=x1-x0,c=(x0+x1)/2;
  box(g,x0,top,w,bot-top,'#17121f');
  // a faint marble veining, fixed to the suite so it never shimmers
  for(let i=0;i<9;i++){
    const vx=x0+w*((i*0.37)%1),vy=top+(bot-top)*((i*0.53)%1);
    line(g,vx,vy,vx+28,vy+46,'rgba(215,185,117,0.16)',0.7);
    line(g,vx+28,vy+46,vx+20,vy+80,'rgba(215,185,117,0.1)',0.6);
  }
  // diagonal sheen bands
  for(const u of [0.18,0.62])poly(g,[x0+w*u,top,x0+w*u+26,top,x0+w*u-34,bot,x0+w*u-60,bot],'rgba(255,255,255,0.035)');
  // the stepped brass cornice
  box(g,x0,top,w,6,goldDk,'#1f1d26',0.5);
  box(g,x0,top+5,w,2,gold);
  for(let k=0;k<3;k++)box(g,c-90+k*16,top+7+k*4,180-k*32,4,k%2?goldDk:gold,'#1f1d26',0.4);
  // fluted gold pilasters at the corners
  for(const px of [x0+4,x1-16]){
    box(g,px,top+7,12,bot-top-15,'#2a2232','#1f1d26',0.5);
    for(let k=0;k<3;k++)line(g,px+3+k*3,top+12,px+3+k*3,bot-12,k===1?goldLt:gold,0.7);
    box(g,px-2,top+7,16,4,gold,'#1f1d26',0.4);
    box(g,px-2,bot-12,16,4,gold,'#1f1d26',0.4);
  }
  // the plinth: polished black marble with a gold edge
  box(g,x0,bot-8,w,8,'#0e0b13','#1f1d26',0.5);
  line(g,x0,bot-8,x1,bot-8,gold,1);
  line(g,x0,bot-5,x1,bot-5,'rgba(255,233,176,0.25)',0.5);
}
function ceoBlock(g,l,f,P){
  const F=OFFICE_CORRIDORS[f.floor],span=l.section.u1-l.section.u0,x0=l.x+l.w/2-span/2,x1=x0+span;
  const top=f.ceilingY,bot=WALL_BASE,k=CEO_DEPTH;
  const T=(px,py)=>[VPX+(px-VPX)*k,YH+(py-YH)*k];
  // the side walls carry the facade round: lacquer, the brass cornice, gold flutes and the
  // marble plinth, all in the side's own perspective
  const gold='#d7b975',goldDk='#927041';
  for(const ex of [x0,x1]){
    const at=(t,y)=>{const [fx,fy]=T(ex,y);return [ex+(fx-ex)*t,y+(fy-y)*t];};
    const band=(y0,y1,fill)=>{const a=at(0,y0),b=at(1,y0),c2=at(1,y1),d=at(0,y1);poly(g,[...a,...b,...c2,...d],fill);};
    const seg=(t0,y0,t1,y1,col,lw)=>{const a=at(t0,y0),b=at(t1,y1);line(g,a[0],a[1],b[0],b[1],col,lw);};
    band(top,bot,'#120e19');
    band(top,top+7,goldDk);
    seg(0,top+6,1,top+6,gold,1);
    for(const t of [0.3,0.55,0.8])seg(t,top+12,t,bot-12,gold,0.7);
    band(bot-8,bot,'#0b0910');
    seg(0,bot-8,1,bot-8,gold,1);
    const [fx,ft]=T(ex,top),[,fb]=T(ex,bot);
    poly(g,[ex,top,fx,ft,fx,fb,ex,bot],null,P.ink,0.6);
  }
  g.translate(VPX,YH);g.scale(k,k);g.translate(-VPX,-YH);
  g.save();
  g.beginPath();g.rect(x0,top,span,bot-top);g.clip();
  bossFacade(g,x0,x1,top,bot);
  g.restore();
  box(g,x0,top,span,bot-top,null,P.ink,0.8);
}

// Screen spans of the lift blocks' fronts: no ceiling light hangs over a lift.
export function officeLiftSpans(f){
  const out=[];
  for(const l of f.landmarks||[]){
    if(l.kind==='ceo'&&l.section){
      const span=l.section.u1-l.section.u0,a=l.x+l.w/2-span/2;
      out.push([VPX+(a-VPX)*CEO_DEPTH-24,VPX+(a+span-VPX)*CEO_DEPTH+24]);
      continue;
    }
    if(!OFFICE_NEAR_LIFT_LANDMARKS.has(l.kind))continue;
    const k=LIFT_DEPTH;
    out.push([VPX+(l.x-VPX)*k-24,VPX+(l.x+l.w-VPX)*k+24]);
  }
  return out;
}

// The cleared stretches of wall, painted with the wall itself, before anything hangs on it.
export function paintOfficeWallSections(g,f){
  const fin=f.founderPlan?.finish;
  const extra=fin?[{x:fin.u0-f.wall.shift,w:fin.u1-fin.u0,section:fin}]:[];
  for(const l of [...(f.landmarks||[]),...extra]){
    // glass rooms keep the building's windows behind them
    if(!l.section||l.section.glass||(OFFICE_FORWARD_LANDMARKS.has(l.kind)&&officeRoomStyle()==='glass'))continue;
    const span=l.section.u1-l.section.u0,a=l.x+l.w/2-span/2;
    if(a+span<f.coverage.left-10||a>f.coverage.right+10)continue;
    wallSection(g,l,f,PAL[f.floor]);
  }
}

export function paintOfficeLandmarks(g,f,landmarks,layer='front'){
  for(const l of landmarks){
    if(OFFICE_BACK_LANDMARKS.has(l.kind)!==(layer==='back'))continue;
    const reach=45+(l.section?(l.section.u1-l.section.u0-l.w)/2:0);
    if(l.x+l.w+reach<f.coverage.left||l.x-reach>f.coverage.right)continue;
    const {x,w,kind}=l,c=x+w/2,b=MID_BASE;
    const drop=MID_BASE-officeLandmarkBase(f.floor,kind);
    const P=kind==='ceo'?{...PAL[f.floor],brass:'#d7b975',brassDk:'#927041',brassLt:'#ffe9b0'}:PAL[f.floor];
    g.save();
    // (a stage too short to clear a bay for it, as in a surge cut, keeps the suite flat on the wall)
    if(kind==='ceo'&&l.section)ceoBlock(g,l,f,P);
    g.translate(0,-drop);
    if(kind==='lobbyLifts'||kind==='operations'||kind==='lift'){
      const floorNumber=kind==='lobbyLifts'?'G':(OFFICE_FLOORS[f.floor]?.label||'23');
      // The lift bay is a solid block standing out of the wall, in the floor's own one-point
      // perspective (as the meeting-room boxes): its front is the wall opening scaled about the
      // vanishing point by LIFT_DEPTH, and its side walls join the two.
      const k=LIFT_DEPTH,vy=YH+drop,T=(px,py)=>[VPX+(px-VPX)*k,vy+(py-vy)*k];
      // floor to ceiling: its side's top edge then lies in the ceiling plane, which recedes to
      // the same vanishing point, so the block reads solid (the eye is near the floor, so the
      // block's top is never seen)
      const wt=f.ceilingY+drop,bt=MID_BASE;
      const side=f.floor==='exec'?'#2a2133':f.floor==='lobby'?'#cbb4b8':'#bdb7c9';
      for(const ex of [x,x+w]){
        const [fx,fy0]=T(ex,wt),[,fy1]=T(ex,bt);
        poly(g,[ex,wt,fx,fy0,fx,fy1,ex,bt],side,P.ink,0.6);
        line(g,ex,bt,fx,fy1,'rgba(20,16,30,0.35)',1);
      }
      g.save();
      g.translate(VPX,vy);g.scale(k,k);g.translate(-VPX,-vy);
      // a pot plant either side of the doors, and the bin
      const pv=f.floor==='lobby'?'palm':f.floor==='exec'?'bonsai':'ficus';
      plant(g,x-40,MID_BASE,pv,P,kind.length+3);
      plant(g,x+w+6,MID_BASE,pv,P,kind.length+7);
      ashtray(g,x+w+48,P);
      // waiting open, and the doors close as the hero comes up to them
      const ahead=x+w/2-112,open=Math.max(0,Math.min(1,(ahead-70)/150));
      const ease=open*open*(3-2*open);
      foregroundLift(g,l,P,floorNumber,wt,ease,f.floor);
      g.restore();
      // its shadow along the floor at the foot of the front
      {const [a0,y1]=T(x,bt),[a1]=T(x+w,bt);box(g,a0,y1,a1-a0,1.6,'rgba(20,16,30,0.3)');}
      g.restore();
      continue;
    }
    if(!l.section&&!officeIsRoomGroup(f.floor,kind)||OFFICE_FORWARD_LANDMARKS.has(kind))facade(g,l,f,P);
    if(paintExtraOfficeRoom(g,l,f,P)){
      g.restore();
      continue;
    }
    if(kind==='ceo'){
      // A single ceremonial entrance: broad double doors, a stepped crown,
      // fluted marble, brass inlay, founder portrait and his case of near misses.
      ceoDoor(g,{x:c-53,y:91,w:106,h:b-91},P);
      for(let k=0;k<3;k++)box(g,c-75+k*7,73+k*5,150-k*14,5,P.brass,P.ink,0.5);
      circ(g,c,64,10,P.brass,P.ink,0.8);
      letters(g,'E',c,68,9,{ink:P.ink,lw:1.2,align:'center'});
      founderPortrait(g,{x:x+41,y:85,w:61,h:76},P);
      plaque(g,'FOUNDER',x+42,166,60,P);
      trophyCase(g,{x:x+w-112,y:89,w:76,h:b-89,runnerUp:true},P); // he never wins
      plaque(g,'EXECUTIVE SUITE',c-69,37,138,P);
      gagNote(g,'BOSS OF THE YEAR: JUDGE - ME',c-90,54,180,P);
      for(const px of [c-78,c+71]){
        box(g,px,111,7,38,P.brass,P.ink,0.5);
        box(g,px-3,116,13,24,'#ffe4b1',P.ink,0.5);
      }
      plant(g,x+24,MID_BASE,'bonsai',P,22);
      plant(g,x+w-27,MID_BASE,'bonsai',P,24);
    }else if(kind==='reception'){
      // The company sign on the wall over a compact counter: no portico, no directories.
      plaque(g,'RECEPTION',c-60,40,120,P);
      const logo={kind:'logo',x:c-79,y:98,w:158,h:56};
      lobbyLogo(g,logo,P);
      signNeon(g,{t:f.t,wall:{hangs:[logo]}},P);
      const desk={kind:'reception',x:c-86,w:172,dy:Math.sin(f.t*1.3)*0.6,label:false};
      midActors(g,{mid:{items:[desk]}},P);
      reception(g,desk,P,'front');
      plant(g,x+12,MID_BASE,'snake',P,9);
      plant(g,x+w-30,MID_BASE,'snake',P,11);
    }else if(kind==='entrance'){
      revolvingEntrance(g,c,b,f.revolving,P);
      plant(g,x+24,MID_BASE,'snake',P,5);
      plant(g,x+w-46,MID_BASE,'snake',P,7);
    }else if(kind==='boardroom'){
      const room={kind:'boardroom',x0:x+40,x1:x+w-62};
      const chairs=Array.from({length:7},(_,i)=>({x:room.x0+(i+0.5)*(room.x1-room.x0)/7,sitter:i!==2,seed:i+400,nod:(Math.sin(f.t*0.5+i)+1)*0.35}));
      const away=officeRoomStyle()!=='glass';
      const contents=away?()=>{
        // the board faces the far wall and its chart, backs to the corridor
        easel(g,room.x1+5,P);
        boardroomFront(g,room,P);
        const seated=chairs.map(ch=>({...ch,away:true}));
        midActors(g,{mid:{items:[{...room,chairs:seated}]}},P);
        for(const ch of seated)chairFromBehind(g,ch,P);
        gagNote(g,'ACCOUNTABILITY',chairs[2].x-43,154,86,P);
      }:()=>{
        boardroomBack(g,room,P,chairs);
        midActors(g,{mid:{items:[{...room,chairs}]}},P);
        boardroomFront(g,room,P);easel(g,room.x1+5,P);
        gagNote(g,'ACCOUNTABILITY',chairs[2].x-43,154,86,P);
      };
      if(officeRoomStyle()==='glass'){contents();glassMeetingRoom(g,l,f,P);}
      else roomWithDepth(g,l,f,P,officeRoomStyle(),contents);
      plaque(g,'BOARD OF DIRECTORS',c-88,66,176,P);
    }else if(kind==='secretary'){
      plaque(g,'EXECUTIVE ASSISTANT',c-73,39,146,P);
      gagNote(g,'YOUR WAIT IS PRODUCTIVE',c-70,55,140,P);
      const deskX=c-58,deskW=116;
      box(g,c-12,b-52,24,20,'#353242',P.ink,0.6);
      box(g,c-8,b-50,16,15,'#554e62',P.ink,0.4);
      midActors(g,{mid:{items:[{kind:'reception',x:deskX,w:deskW,dy:Math.sin(f.t*1.3)*0.5}]}},P);
      // Her terminal and phone sit above the compact counter; the headset keeps
      // the executive assistant legible as staff rather than another waiting guest.
      box(g,c+20,b-47,22,14,'#d5d0c4',P.ink,0.5);
      box(g,c+22,b-45,18,10,'#213a38',P.ink,0.35);
      letters(g,'CEO',c+31,b-37,2.4,{ink:'#b5e8ca',lw:0.35,align:'center'});
      line(g,c+31,b-33,c+31,b-31,P.ink,0.7);
      box(g,c+27,b-31,8,1.2,P.chrome,P.ink,0.3);
      box(g,c-43,b-37,9,4,'#272431',P.ink,0.4);
      line(g,c-42,b-38,c-34,b-38,'#ddd4c1',0.8);
      circ(g,c-38,b-35,1.2,'#e5c3a0',P.ink,0.3);
      box(g,deskX-2,b-32,deskW+4,4,'#c4b78f',P.ink,0.6);
      box(g,deskX,b-28,deskW,28,'#5d5666',P.ink,0.6);
      box(g,deskX+18,b-22,deskW-36,13,'#494353',P.ink,0.4);
      letters(g,'PLEASE WAIT',c,b-12,4.1,{ink:'#f2e7d3',lw:0.55,align:'center',track:0.25});
      for(const dx of [deskX+9,deskX+deskW-11]){
        box(g,dx,b-23,2,17,'#857d83',P.ink,0.3);
        line(g,dx+0.5,b-17,dx+1.5,b-17,'#e2d8c2',0.55);
      }
    }else if(kind==='library'){
      plaque(g,'EXECUTIVE LIBRARY',c-85,39,170,P);
      gagNote(g,'BOOKS PURCHASED BY THE METRE',c-77,55,154,P);
      const shelfW=Math.min(96,(w-84)/2);
      for(const dx of [x+24,x+w-24-shelfW])bookshelf(g,{x:dx,y:72,w:shelfW,h:b-72},P);
    }else if(kind==='sculpture'){
      plaque(g,'THE EGG / 1989',c-76,67,152,P);
      gagNote(g,'ART BY COMMITTEE',c-58,86,116,P);
      sculpture(g,{x:c-20},P);
      for(const dx of [x+27,x+w-55])plant(g,dx,MID_BASE,'snake',P,8);
    }
    g.restore();
  }
}
