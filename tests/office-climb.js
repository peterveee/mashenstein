// Contract checks at the actual background/world boundary, including portrait's
// independent backdrop scale and camera anchor. No DOM pixel claims here.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { officePack, officeFloorFor, officeWarmJobs, officeCacheStats } = await import('../src/engine/stylePacks/officeLigne.js');
const { officeFrame, OFFICE_FLOORS, OFFICE_ZOOM, FACTORS } = await import('../src/engine/stylePacks/officeClimb.js');
const { STYLE } = await import('../src/engine/stylePacks/officeLigne/index.js');
const { GROUND_Y, applyWorld, BG_FOLLOW } = await import('../src/engine/camera.js');
const { frameForViewport, setActiveFrame, defaultFrame } = await import('../src/engine/frame.js');
const { terrainGroundY, hasRollingProfile, setGroundRises, setStageWave } = await import('../src/game/terrain.js');
const { midActors } = await import('../src/engine/stylePacks/officeLigne/room.js');
const { PAL, YH, xOf } = await import('../src/engine/stylePacks/officeLigne/line.js');
const { MID_BASE } = await import('../src/engine/stylePacks/officeClimb.js');
const { OFFICE_CORRIDORS, OFFICE_LANDMARK_BASE, OFFICE_FURNITURE_BASE, OFFICE_CLEAR_VIEW, officeFurnitureCuts, officeFurnitureExtent, officeLandmarks } = await import('../src/engine/stylePacks/officeLigne/progression.js');
for(const floor of ['lobby','open','exec']){
 const corridor=OFFICE_CORRIDORS[floor];
 assert.ok(!corridor.wall.hangs.some(h=>['door','logo','portrait','trophyCase','lift'].includes(h.kind)),'named architecture never enters a repeating strip');
 assert.ok(!corridor.mid.items.some(m=>['reception','boardroom','desk','sculpture','tallclock','globe'].includes(m.kind)),'distinctive rooms never enter a repeating strip');
 // Real finite stages run at least ~12000 px (a minute at the base speed); rooms scroll at the slower far-room rate.
 for(const distance of [9000,15000,26208]){
  const places=officeLandmarks(floor,0,distance);
  assert.equal(new Set(places.map(p=>p.kind+p.at)).size,places.length,'each landmark is placed exactly once');
  assert.ok(places.at(-1).at>=0.75,'the last landmark is near the finish');
  const later=officeLandmarks(floor,distance,distance);
  for(let i=0;i<places.length;i++){
   assert.equal(later[i].worldX,places[i].worldX,'landmarks stay anchored when the camera advances');
   assert.ok(later[i].x+later[i].w/2<112,'the hero reaches each landmark before the finish');
   if(i)assert.ok(places[i-1].worldX<places[i].worldX,'landmarks keep their itinerary order');
  }
  // A wall section takes over whole window bays: it never lies across a picture's stretch of
  // solid wall, and two sections never share a bay.
  const def=OFFICE_CORRIDORS[floor].wall,sections=places.filter(p=>p.section);
  for(const [i,p] of sections.entries()){
   const {u0,u1}=p.section,j=Math.floor(u0/def.period),bay=def.bays.find(b=>b.type==='glass'&&b.u+j*def.period<=u0+1e-6&&b.u1+j*def.period>=u1-1e-6);
   assert.ok(bay,`${floor} ${p.kind}: a wall section sits inside one window bay`);
   assert.ok(Math.abs((112+p.worldX*p.rate)-(u0+u1)/2)<1e-6,'the place sits in the middle of its cleared bay');
   assert.ok(p.w<=u1-u0+1e-9,'and fits inside it');
   for(const q of sections.slice(i+1))assert.ok(q.section.u0>=u1||q.section.u1<=u0,'sections never share a bay');
  }
 }
 assert.deepEqual(officeLandmarks(floor,0,Infinity),[],'endless mode has no invented repeating finish');
}
assert.ok(officeLandmarks('open',0,26208).some(l=>l.kind==='canteen'&&l.at>0.4&&l.at<0.6),'floor 23 has a central eating area');
assert.ok(officeLandmarks('open',0,26208).find(l=>l.kind==='canteen').w<=220,'the canteen is a small kitchen');
for(const floor of ['lobby','open','exec']){
 const before=officeLandmarks(floor,12000,26208),after=officeLandmarks(floor,12291.2,26208);
 for(let i=0;i<before.length;i++)assert.ok(Math.abs(before[i].x-after[i].x-291.2*before[i].rate)<1e-7,'each landmark scrolls at its own depth');
 const a=officeFrame(floor,12000,0,undefined,OFFICE_CORRIDORS[floor]);
 const b=officeFrame(floor,12291.2,0,undefined,OFFICE_CORRIDORS[floor]);
 assert.ok(b.wall.shift-a.wall.shift<b.mid.shift-a.mid.shift,'the wall remains behind the furniture in parallax depth');
 const furnitureRate=(b.mid.shift-a.mid.shift)/291.2;
 for(const l of before){
  if(l.section)assert.ok(Math.abs(l.rate-FACTORS.wall*OFFICE_ZOOM)<1e-9,`${floor} ${l.kind}: a wall section scrolls with the wall`);
  else if(floor==='lobby'&&l.kind==='lounge')assert.ok(Math.abs(l.rate-furnitureRate)<1e-9,'the waiting area stands on the furniture line');
  else assert.ok(Math.abs(l.rate-FACTORS.wall*OFFICE_ZOOM)<1e-9,`${floor} ${l.kind}: rooms and lifts hang on the wall and scroll with it`);
 }
 assert.ok(OFFICE_LANDMARK_BASE===OFFICE_FURNITURE_BASE&&OFFICE_FURNITURE_BASE<MID_BASE,'rooms share the furniture line, behind the card\'s row');
 assert.ok(Math.abs(OFFICE_CORRIDORS[floor].mid.factor-(OFFICE_FURNITURE_BASE-YH)/(232-YH))<1e-12,'furniture feet ride the floor beneath them');
 // No piece of furniture is ever visible across a landmark that is on screen, and none is
 // sliced or pops: each piece instance is either always culled or never culled.
 const distance=26208,rooms=officeLandmarks(floor,0,distance),coverage={left:-64,right:544};
 for(const room of rooms){
  const verdict=new Map();
  for(let cam=room.worldX-2600;cam<=room.worldX+2600;cam+=5){
   const frame=officeFrame(floor,cam,0,coverage,OFFICE_CORRIDORS[floor]);
   const landmarks=officeLandmarks(floor,cam,distance),here=landmarks.find(l=>l.kind===room.kind&&l.at===room.at);
   const cuts=officeFurnitureCuts(frame,landmarks);
   for(const m of frame.mid.items){
    const [x0,x1]=officeFurnitureExtent(m),culled=cuts.some(([c0,c1])=>c0<=x0+1e-6&&c1>=x1-1e-6);
    if(!culled)assert.ok(!cuts.some(([c0,c1])=>x1>c0+1e-6&&x0<c1-1e-6),`${floor} ${room.kind}: a piece is never sliced`);
    const key=`${m.kind}|${Math.round((m.x0??m.x)+frame.mid.shift)}`;
    if(x1>coverage.left&&x0<coverage.right){
     if(verdict.has(key))assert.equal(verdict.get(key),culled,`${floor} ${room.kind}: ${m.kind} never pops in or out`);
     verdict.set(key,culled);
    }
    // places hang on the wall, so furniture may pass in front of one near the edges of the
    // view; while it crosses the middle, nothing does
    const central=here.x<OFFICE_CLEAR_VIEW[1]&&here.x+here.w>OFFICE_CLEAR_VIEW[0];
    if(!culled&&central)assert.ok(x1<=here.x||x0>=here.x+here.w,`${floor} ${room.kind}: furniture never crosses it mid-view`);
   }
  }
 }
}
setGroundRises([]); setStageWave(null);
assert.equal(hasRollingProfile({id:'office'}),false,'an office has a level floor');
for(let x=0;x<=6000;x+=17) assert.equal(terrainGroundY({id:'office'},x),GROUND_Y,'office physics and scenery share a flat lane');
for(const pop of [0,0.25,0.5,0.75,1])for(const dy of [-0.8,0,0.8]){
 const paths=[]; let vertices=[];
 const actor=new Proxy({
  beginPath:()=>{vertices=[];},
  moveTo:(x,y)=>vertices.push([x,y]),lineTo:(x,y)=>vertices.push([x,y]),
  closePath:()=>paths.push([...vertices]),
 },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 midActors(actor,{mid:{items:[{kind:'cubicles',desks:[{occupied:true,x:0,seed:2,pop,dy,look:1}]}]}},PAL.open);
 const shirt=paths[0];
 assert.ok(Math.max(...shirt.map(v=>v[1]))>MID_BASE-34,'worker body overlaps the partition through every peek/bob pose');
}
function recorder() {
 let m=[1,0,0,1,0,0], stack=[];
 const context = new Proxy({
  getTransform:()=>({a:m[0],b:m[1],c:m[2],d:m[3],e:m[4],f:m[5]}),
  setTransform:(...v)=>{m=v;},
  translate:(x,y)=>{m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
  scale:(x,y)=>{m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
  save:()=>stack.push([...m]),restore:()=>{m=stack.pop();},
 }, {get:(t,k)=>k in t?t[k]:()=>{}});
 return context;
}
const point=(ctx,x,y)=>{const m=ctx.getTransform();return [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];};
for (const [stage, floor] of [[1,'lobby'],[2,'open'],[3,'exec']]) {
 assert.equal(officeFloorFor(stage),floor);
 assert.equal(officePack({stageIndex:stage}).lightBg,stage!==3,'lighting is correct before first paint');
 const frame=officeFrame(floor,991,4);
 assert.deepEqual(frame,officeFrame(floor,991,4),'frame deterministic');
 for(const layer of ['wall','mid']){
  const rate=FACTORS[layer];
  // Derive the wrap distance from the actual frame, not a duplicated period.
  const period=frame[layer].period;
  const next=officeFrame(floor,991+period/(OFFICE_ZOOM*rate),4);
  // Model shifts differ by a whole period; the visible instances are the same.
  assert.ok(Math.abs((next[layer].shift-frame[layer].shift)-period)<1e-8);
 }
}
const paint=STYLE.paint, front=STYLE.paintFront;
try {
 for(const portrait of [false,true])for(const zoom of [2,2.2,3.5,1.3])for(const pan of [0,38])for(const floorY of [GROUND_Y,GROUND_Y-90]){
  const active=portrait?frameForViewport({mode:'phone-portrait',viewportWidth:393,viewportHeight:852}):defaultFrame();
  setActiveFrame(active);
  const fs=active.groundScreenY-GROUND_Y, shift=(portrait?0:pan)+(GROUND_Y-floorY)*zoom*BG_FOLLOW;
  const bgZoom=portrait?1.78:1, xOffset=portrait?-74:0;
  const ctx=recorder();ctx.translate(0,fs+shift);ctx.translate(240,GROUND_Y);ctx.scale(bgZoom,bgZoom);ctx.translate(-240,-GROUND_Y);ctx.translate(xOffset,0);
  let roomLane, roomHero, postT;
  STYLE.paint=(g,f)=>{roomLane=point(g,0,GROUND_Y);roomHero=point(g,112,GROUND_Y);};
  STYLE.paintFront=(g,f)=>{postT=f.t;assert.ok(f.front.every(it=>it.kind!=='pillar'));};
  const pack=officePack({stageIndex:3});
  pack.bg(ctx,17,912,null,5000,null,shift,{portrait,stageIndex:3,frameShiftY:fs,backgroundZoom:bgZoom,backgroundXOffset:xOffset,worldXOffset:xOffset,worldZoom:zoom,worldPan:pan,worldFloorY:floorY});
  const world=recorder();applyWorld(world,zoom,pan,floorY,xOffset);
  const lane=point(world,0,GROUND_Y), hero=point(world,56,GROUND_Y);
  for(let i=0;i<2;i++){assert.ok(Math.abs(roomLane[i]-lane[i])<1e-8);assert.ok(Math.abs(roomHero[i]-hero[i])<1e-8);}
  pack.post(recorder(),999);
  assert.equal(postT,17,'front uses the scenery clock rather than post gameplay time');
 }
} finally {STYLE.paint=paint;STYLE.paintFront=front;setActiveFrame(defaultFrame());}
for(const floor of [1,2,3,1]){
 officeWarmJobs(floor).forEach(job=>job());
 const stats=officeCacheStats();assert.equal(stats.entries,1);assert.ok(stats.residentBytes<40*1024*1024);
}
const ground=recorder(), rectangles=[];
let clipped;
ground.rect=(...args)=>rectangles.push(args);
ground.clip=()=>{clipped ??= [...rectangles];};
officePack().ground(ground,100,null,[{live:true,x:150,w:20,def:{isGap:true}}],[{x:200,w:30}],0,200,null,null,300);
assert.deepEqual(clipped,[[0,232,50,68],[70,232,30,68],[130,232,70,68]],'slab leaves gaps and tunnel overhangs open');
// The founder's artwork: every piece exists, fits its bay, never repeats back to back, and shows up on every floor.
{
 const { officeArtworks } = await import('../src/engine/stylePacks/officeLigne/artwork.js');
 const { PROFESSOR_PIECES, PROFESSOR_BY_FLOOR, PROFESSOR_PLAN, SPRITE } = await import('../src/engine/stylePacks/officeLigne/professorArt.js');
 const extraIds=['founderTravel','founderNouveau','founderDeco','founderWoodblock','founderCubist','founderSurreal','founderBauhaus','founderNoir','founderDiner','founderPsychedelic','founderDisco','founderFitness','founderMedieval','founderCutout','founderSafety','founderGouache','founderMidcentury','founderCutaway','founderCrayon'];
 assert.equal(Object.keys(PROFESSOR_PIECES).length,29,'the Founder collection has 29 pieces after adding the office-style portraits');
 assert.ok(!PROFESSOR_PIECES.crayon,'the childlike crayon poster is removed from the collection');
 assert.match(PROFESSOR_PIECES.founderCrayon.style,/wax crayon/i,'the new crayon piece is a formal portrait treatment');
 const everywhere=Object.values(PROFESSOR_PLAN).flat().map(([id])=>id);
 assert.equal(new Set(everywhere).size,everywhere.length,'no founder piece hangs twice anywhere in the building');
 for(const [id,floor] of [['wants','open'],['blueprint','open'],['constructivist','open'],['pop','open'],['founderDeco','lobby']])
  assert.ok(PROFESSOR_PLAN[floor].some(([planned])=>planned===id),`${id} hangs on ${floor}`);
 assert.ok(!Object.values(PROFESSOR_PLAN).flat().some(([id])=>id==='crayon'),'the retired crayon poster is never planned');
 const galleryPortraitIds=['founderDeco','founderGouache','founderMidcentury','founderCutaway','founderCrayon'];
 for(const id of galleryPortraitIds){
  assert.equal(PROFESSOR_PIECES[id].galleryPainter,true,`${id}: use the exact office-style gallery painter`);
 }
 for(const id of ['founderDeco','founderGouache']){
  assert.ok(Object.values(PROFESSOR_PLAN).flat().some(([planned])=>planned===id),`${id}: hangs somewhere`);
  assert.ok(PROFESSOR_PIECES[id].plainFrame,`${id}: use the requested simple outer frame`);
 }
 for(const id of extraIds){
  const d=PROFESSOR_PIECES[id];
  assert.ok(d&&typeof d.paint==='function'&&Number.isFinite(d.w)&&d.w>0&&Number.isFinite(d.h)&&d.h>0,`${id}: registered poster painter and dimensions`);
  assert.ok(d.suggestedFloors.every(f=>['lobby','open','exec'].includes(f)),`${id}: valid curation suggestion`);
 }
 assert.ok(SPRITE.length===32&&SPRITE.every(r=>r.length===22),'the pixel sprite is a clean 22 x 32 grid');
 for(const floor of ['lobby','open','exec']){
  for(const id of PROFESSOR_BY_FLOOR[floor])assert.ok(PROFESSOR_PIECES[id],`${floor}: ${id} is a piece`);
  const seen=new Set();
  for(let cam=0;cam<30000;cam+=97){
   const f=officeFrame(floor,cam,0,undefined,OFFICE_CORRIDORS[floor]);
   const a=officeArtworks(f),b=officeArtworks(f);
   assert.deepEqual(a,b,'the wall art is deterministic');
   let last=null;
   for(const art of a){
    if(!art.professor){last=null;continue;}
    seen.add(art.professor);
    assert.notEqual(art.professor,last,`${floor}: the same piece never hangs twice running`);
    last=art.professor;
    const d=PROFESSOR_PIECES[art.professor];
    assert.ok(art.w===d.w&&art.h===d.h,'a piece hangs at its own size, never stretched');
    assert.ok(art.y>=60&&art.y+art.h<=172,'a piece hangs between the ceiling and the dado');
   }
   for(let i=1;i<a.length;i++)if(a[i].x>a[i-1].x)assert.ok(a[i].x>=a[i-1].x+a[i-1].w+8,'pictures never overlap');
  }
  assert.ok(seen.size>=1,`${floor}: the founder hangs in endless runs too (${[...seen]})`);
 }
}
// A real stage: each of the floor's pieces hangs exactly once, near its place, never under a room.
{
 const { officeArtworks } = await import('../src/engine/stylePacks/officeLigne/artwork.js');
 const { PROFESSOR_PLAN, PROFESSOR_PIECES } = await import('../src/engine/stylePacks/officeLigne/professorArt.js');
 const { officeFounderPlan } = await import('../src/engine/stylePacks/officeLigne/progression.js');
 for(const [floor,distance] of [['lobby',22050],['open',22050],['exec',22050],['open',26208]]){
  const plan=officeFounderPlan(floor,distance),found=new Map();
  assert.equal(plan,officeFounderPlan(floor,distance),'the plan is built once per stage');
  for(let cam=-300;cam<distance+400;cam+=60){
   const f=officeFrame(floor,cam,0,undefined,OFFICE_CORRIDORS[floor]);
   f.founderPlan=plan;
   for(const art of officeArtworks(f)){
    if(!art.professor)continue;
    const abs=Math.round(art.x+f.wall.shift);
    if(!found.has(art.professor))found.set(art.professor,new Set());
    found.get(art.professor).add(abs);
   }
  }
  for(const [id,at] of PROFESSOR_PLAN[floor]){
   const spots=found.get(id);
   assert.ok(spots,`${floor} ${distance}: ${id} hangs somewhere`);
   assert.equal(spots.size,1,`${floor} ${distance}: ${id} hangs once, not ${[...spots]}`);
   const wallRate=FACTORS.wall*OFFICE_ZOOM;
   const abs=[...spots][0],planned=distance*at*wallRate;
   assert.ok(Math.abs(abs-planned)<distance*0.15*wallRate,`${floor} ${distance}: ${id} hangs near its place along the floor`);
   if(id!==plan.finish?.id)for(const [a,b] of plan.avoid)assert.ok(abs>b||abs+PROFESSOR_PIECES[id].w<a,`${floor}: ${id} is never hung under a room`);
  }
  assert.equal(found.size,PROFESSOR_PLAN[floor].length,'no other piece turns up');
  // in their planned order, spread evenly along the floor
  const xs=PROFESSOR_PLAN[floor].map(([id])=>[...found.get(id)][0]);
  const gaps=xs.slice(1).map((x,i)=>x-xs[i]),mean=(xs.at(-1)-xs[0])/gaps.length;
  for(const gap of gaps)assert.ok(gap>mean*0.5&&gap<mean*1.6,`${floor} ${distance}: founder pieces are evenly spread (${gaps.map(Math.round)})`);
 }
}
console.log('ok: office floors, clocks, camera/portrait joins, pillar exclusion and bounded warm cache');
