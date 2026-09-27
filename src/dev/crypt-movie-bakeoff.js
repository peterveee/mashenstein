// Review-only Crypt movie-night ideas. The gallery uses the real Crypt backdrop
// and lane; none of these painters is registered as a live obstacle or landmark.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { GOUACHE_KIT } from '../engine/stylePacks/cryptGouache.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

const I = '#252333', CREAM = '#ece4cd', LILAC = '#a7a0ce', TEAL = '#93c7b8';
const GOLD = '#f6c77b', RED = '#d36c72', DARK = '#27253e';
const PI2 = Math.PI * 2;
const ellipse = (c,x,y,rx,ry,fill,stroke=I,w=2) => {
  c.beginPath(); c.ellipse(x,y,rx,ry,0,0,PI2); c.fillStyle=fill; c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
};
const poly = (c,points,fill,stroke=I,w=2) => {
  c.beginPath(); points.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y)); c.closePath();
  c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin='round';c.stroke();}
};
const line = (c,points,color=I,w=2) => {
  c.beginPath();points.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();
};
const rect = (c,x,y,w,h,fill,stroke=I,sw=2) => {
  c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=sw;c.strokeRect(x,y,w,h);}
};
const txt = (c,text,x,y,size=8,color=CREAM) => {
  c.fillStyle=color;c.font=`bold ${size}px system-ui`;c.textAlign='center';c.fillText(text,x,y);
};

function laneArt(c,t,type) {
  const bob=Math.sin(t*4), flap=Math.sin(t*8), tick=Math.sin(t*5);
  c.save();
  c.translate(0,-Math.max(0,bob)*2);
  if(type==='popcorn'){
    poly(c,[[-29,-65],[29,-65],[23,-3],[-23,-3]],'#c65f68');
    for(let x=-18;x<=18;x+=12) poly(c,[[x-4,-62],[x+1,-62],[x+5,-5],[x-1,-5]],CREAM,null);
    ellipse(c,0,-65,31,7,'#f2e6bf');
    for(let j=0;j<7;j++){const x=-24+j*8,y=-76-(j%3)*5-(j===3?Math.max(0,bob)*8:0);ellipse(c,x,y,6,5,'#f7df95',I,1.2);}
    ellipse(c,-8,-39,3,5,I,null);ellipse(c,8,-39,3,5,I,null);
    line(c,[[-5,-23],[0,-19],[5,-23]],I,2.5);
  }else if(type==='teeth'){
    ellipse(c,0,-33,37,25,RED);ellipse(c,0,-37,31,17,I,null);
    for(let j=-2;j<=2;j++){rect(c,j*11-5,-52,10,15,CREAM,I,1);rect(c,j*11-5,-34+flap*2,10,13,CREAM,I,1);}
    ellipse(c,-15,-59,3,4,CREAM,null);ellipse(c,15,-59,3,4,CREAM,null);
    rect(c,-21,-5,10,5,GOLD);rect(c,12,-5,10,5,GOLD);
  }else if(type==='reel'){
    ellipse(c,0,-40,36,36,LILAC);ellipse(c,0,-40,28,28,'#53516e',null);
    for(let j=0;j<5;j++){const a=t*.8+j*PI2/5;ellipse(c,Math.cos(a)*17,-40+Math.sin(a)*17,6,6,CREAM,I,1);}
    ellipse(c,0,-40,6,6,GOLD);line(c,[[28,-17],[43,-11],[50,-11]],'#d6c6a1',4);
    rect(c,-40,-5,80,5,'#3e4054');
  }else if(type==='moon'){
    ellipse(c,0,-52,35,35,'#f5e3a8');ellipse(c,-12,-60,7,5,'#d3c28e',null);
    ellipse(c,13,-37,5,7,'#d3c28e',null);ellipse(c,7,-70,4,3,'#d3c28e',null);
    line(c,[[-45,-6],[-27,-21],[-12,-9],[4,-24],[30,-5]],'#9f866e',5);
    rect(c,-40,-6,80,7,'#735967');
  }else if(type==='tentacle'){
    poly(c,[[-29,-36],[31,-36],[22,-4],[-19,-4]],'#7d8fc3');
    line(c,[[-16,-35],[-8,-60],[6,-73],[18,-66],[24,-45],[37,-42]],'#5a9d91',14);
    for(let j=0;j<4;j++) ellipse(c,-7+j*10,-51-(j%2)*10,2.4,2.4,CREAM,null);
    ellipse(c,10,-62,3,4,I,null);rect(c,-30,-37,62,8,GOLD);
    txt(c,'MONSTER',0,-16,8,CREAM);
  }else if(type==='bat'){
    c.translate(0,-62+flap*4);
    poly(c,[[-4,0],[-18,-16],[-31,-10],[-47,-17],[-37,1],[-21,7],[-10,4]],'#7e709d');
    poly(c,[[4,0],[18,-16],[31,-10],[47,-17],[37,1],[21,7],[10,4]],'#7e709d');
    ellipse(c,0,0,12,11,'#514763');poly(c,[[-10,-7],[-9,-20],[0,-9],[9,-20],[10,-7]],'#514763');
    ellipse(c,-4,-2,2,2,GOLD,null);ellipse(c,4,-2,2,2,GOLD,null);
    line(c,[[-4,7],[0,10],[4,7]],CREAM,1.5);
  }else if(type==='toyUfo'){
    c.translate(0,-53+Math.sin(t*3)*4);
    ellipse(c,0,-5,27,24,TEAL);ellipse(c,0,-10,38,10,'#ae98c5');
    for(let j=-2;j<=2;j++) ellipse(c,j*13,-8,3,3,GOLD,null);
    ellipse(c,-7,-24,3,4,I,null);ellipse(c,7,-24,3,4,I,null);
    line(c,[[-25,4],[-18,26],[18,26],[25,4]],'#8ed4c1',2);
  }else if(type==='clapper'){
    rect(c,-32,-60,64,56,'#3d3d57');rect(c,-34,-72,68,13,CREAM);
    for(let j=-2;j<=2;j++) poly(c,[[j*13-5,-71],[j*13+1,-71],[j*13+9,-60],[j*13+3,-60]],I,null);
    c.save();c.translate(-31,-72);c.rotate(-.12+Math.max(0,tick)*.26);
    rect(c,0,-12,67,11,'#d8d1bf');c.restore();
    txt(c,'TAKE 13',0,-33,10,CREAM);txt(c,'CRYPT',0,-16,8,GOLD);
  }else if(type==='projector'){
    rect(c,-30,-51,58,42,'#6d768a');ellipse(c,19,-37,17,17,'#dfc182');ellipse(c,19,-37,9,9,'#594b70');
    ellipse(c,-14,-62,15,15,'#a6a2bb');ellipse(c,11,-64,14,14,'#a6a2bb');
    for(const x of [-14,11]) for(let j=0;j<4;j++){const a=t+j*PI2/4;ellipse(c,x+Math.cos(a)*8,-63+Math.sin(a)*8,2,2,I,null);}
    line(c,[[-17,-9],[-21,0]],I,5);line(c,[[16,-9],[20,0]],I,5);
  }else if(type==='candy'){
    poly(c,[[-8,-78],[14,-64],[31,-8],[-31,-8]],'#e7a56a');
    poly(c,[[-24,-30],[25,-30],[31,-8],[-31,-8]],CREAM);poly(c,[[-15,-59],[19,-59],[25,-30],[-24,-30]],'#ebc77e');
    ellipse(c,-8,-44,4,5,I,null);ellipse(c,8,-44,4,5,I,null);line(c,[[-8,-18],[0,-14],[8,-18]],I,2);
    line(c,[[-20,-5],[-25,1]],I,4);line(c,[[20,-5],[25,1]],I,4);
  }else if(type==='umbrella'){
    line(c,[[0,-69],[0,-5],[10,-3],[15,-9]],'#b9a3a8',4);
    poly(c,[[-40,-66],[-23,-86],[0,-94],[24,-86],[40,-66],[22,-69],[9,-65],[0,-69],[-9,-65],[-22,-69]],'#785a88');
    ellipse(c,-7,-54,3,3,GOLD,null);ellipse(c,7,-54,3,3,GOLD,null);
    poly(c,[[-20,-50],[20,-50],[16,-27],[-16,-27]],'#51405f');
    poly(c,[[-18,-28],[18,-28],[8,-3],[-8,-3]],'#a08096');
  }else if(type==='mask'){
    poly(c,[[-30,-70],[0,-85],[30,-70],[27,-27],[0,-7],[-27,-27]],'#ded7c8');
    poly(c,[[-29,-69],[-16,-78],[-20,-36],[-29,-43]],'#7c7399');
    poly(c,[[29,-69],[16,-78],[20,-36],[29,-43]],'#7c7399');
    ellipse(c,-11,-54,7,8,I,null);ellipse(c,11,-54,7,8,I,null);
    ellipse(c,0,-27,7,10,I,null);line(c,[[-26,-6],[26,-6]],'#947e7e',4);
  }
  c.restore();
}

export const CRYPT_MOVIE_LANE = [
  ['L01','Possessed popcorn','A hopping bucket spills one cheeky kernel; low jump silhouette.','popcorn'],
  ['L02','Chattering teeth','A wind-up jaw chatters while its little shoes tap.','teeth'],
  ['L03','Runaway film reel','Big round roller with spinning spokes and trailing celluloid.','reel'],
  ['L04','Fallen moon prop','A cardboard movie moon has tumbled into the lane.','moon'],
  ['L05','Tentacle snack','A rubber creature arm escapes from a cinema cup.','tentacle'],
  ['L06','Squeaky bat','An overhead plush bat flaps low enough to suggest a slide.','bat'],
  ['L07','Wind-up saucer','Toy UFO bobs at hazard height; comic alien, no real spaceship.','toyUfo'],
  ['L08','Haunted clapperboard','The slate snaps open and shut like a mouth.','clapper'],
  ['L09','Angry projector','Twin reels spin; the lens glares at the runner.','projector'],
  ['L10','Candy-corn gremlin','A triangular trick-or-treat nuisance with tiny shoes.','candy'],
  ['L11','Vampire umbrella','A caped umbrella hovers overhead in the slide lane.','umbrella'],
  ['L12','Movie monster mask','A rubber scream mask on a rolling stand, stage-prop camp.','mask'],
].map(([id,name,note,type])=>({id,name,note,type}));

let pack, crypt;
function ready(){if(!pack){crypt=CABINETS.find(x=>x.id==='crypt');pack=getStylePack('gouache',{});}}
const pose=t=>({kind:'run',phase:t*1.6%1,time:t,vy:0,grounded:true,squash:0,lean:0,facing:1});

export function drawCryptMovieLane(c,t,item,close=false){
  ready();
  if(close){
    c.fillStyle='#343548';c.fillRect(0,0,480,270);c.fillStyle='#414358';c.fillRect(0,218,480,52);
    c.save();c.translate(74,216);c.scale(3.8,3.8);drawToon(c,'lorenzo',pose(t),0,0,HERO_DRAW_H);c.restore();
    c.save();c.translate(240,216);laneArt(c,t,item.type);c.restore();
    c.save();c.translate(408,216);c.scale(3.8,3.8);drawToon(c,'gary',pose(t),0,0,HERO_DRAW_H);c.restore();
    txt(c,'LORENZO',74,252,10);txt(c,item.id+' '+item.name.toUpperCase(),240,252,10);txt(c,'GARY',408,252,10);
    return;
  }
  const camX=1100+t*28;
  c.save();pack.bg(c,t,camX,crypt,1000,null,0,{stageIndex:2,progress:0.22,cryptLife:false});
  c.save();applyWorld(c,ZOOM,0,GROUND_Y);pack.ground(c,camX,crypt,[],[],t*60,VIEW_W);
  drawToon(c,'lorenzo',pose(t),PLAYER_X,GROUND_Y,HERO_DRAW_H);
  c.save();c.translate(147,GROUND_Y);c.scale(.26,.26);laneArt(c,t,item.type);c.restore();
  c.restore();c.restore();
}

// Background candidates are painted in the Crypt pack's depth study seam.
// Their paint functions use stage-local ridge coordinates in screen pixels.
function backdropArt(c,f,type){
  const t=f.t, bob=Math.sin(t*1.8), flick=Math.sin(t*8)>0.72;
  c.save();c.translate(f.x,f.y);c.globalAlpha=.88;
  if(type==='drivein'){
    poly(c,[[-90,0],[-82,-92],[79,-92],[87,0]],'#353552','#7d83a8',2);
    rect(c,-72,-82,144,74,'#c9c6c4','#29273f',3);
    rect(c,-67,-77,134,64,flick?'#c8bbba':'#aeb7c4',null);
    ellipse(c,8,-47,20,21,'#686783',null);poly(c,[[-15,-20],[10,-65],[27,-20]],'#555672',null);
    ellipse(c,-2,-52,3,3,'#e6d9c8',null);ellipse(c,16,-52,3,3,'#e6d9c8',null);
    for(const x of [-58,0,51]){rect(c,x-18,-7,36,8,'#252339');ellipse(c,x-12,0,5,3,'#181728');ellipse(c,x+12,0,5,3,'#181728');}
  }else if(type==='carnival'){
    poly(c,[[-83,0],[-68,-56],[0,-96],[69,-55],[84,0]],'#61526d','#a794af',2);
    for(let j=-3;j<=3;j++) poly(c,[[j*20-10,0],[j*20,-76+Math.abs(j)*8],[j*20+10,0]],j%2?'#aa7580':'#d0a29d',null);
    rect(c,-14,-40,28,40,'#29243f');for(let j=-3;j<=3;j++) ellipse(c,j*23,-51+Math.abs(j)*7,2,2,GOLD,null);
    line(c,[[0,-96],[0,-113]],'#9586a2',2);poly(c,[[0,-113],[21,-107],[0,-101]],RED,null);
  }else if(type==='motel'){
    poly(c,[[-90,-2],[-83,-75],[73,-75],[89,-2]],'#3e3b58','#777c9c',2);
    poly(c,[[-96,-74],[-65,-95],[61,-95],[84,-74]],'#29283e');
    for(const y of [-66,-36])for(const x of [-59,-22,15,52]){rect(c,x-10,y,21,22,'#2b2c45','#74708a',1);if((x+y)%3)rect(c,x-7,y+3,15,14,'#a48a89',null);}
    rect(c,75,-90,33,58,'#343249','#a6898b',2);txt(c,'M',91,-76,10,GOLD);txt(c,'O',91,-64,10,GOLD);txt(c,'T',91,-52,10,GOLD);
    txt(c,flick?'EL':'E L',91,-39,8,flick?GOLD:'#746270');
  }else if(type==='saucer'){
    c.globalAlpha=.25;poly(c,[[-8,-42],[-60,0],[65,0],[11,-42]],'#b3edd9',null);c.globalAlpha=1;
    ellipse(c,0,-62+bob*2,53,12,'#777894','#c1bed4',2);ellipse(c,0,-74+bob*2,28,18,'#9bbdba','#c1d9cb',2);
    for(let j=-3;j<=3;j++)ellipse(c,j*13,-60+bob*2,2.4,2.4,j%2?GOLD:'#d4efdd',null);
    ellipse(c,0,-78+bob*2,4,5,'#4c6870',null);rect(c,-5,-13,10,13,'#5d6174');
  }else if(type==='backlot'){
    rect(c,-88,-68,65,68,'#45415d','#86829e',2);poly(c,[[-91,-68],[-56,-95],[-21,-68]],'#303049');
    rect(c,-8,-53,76,53,'#55506a','#9790a6',2);poly(c,[[-11,-53],[30,-79],[72,-53]],'#333045');
    rect(c,-78,-47,12,21,'#a99ba0');rect(c,-46,-47,12,21,'#a99ba0');rect(c,17,-42,12,18,'#ada2a7');
    line(c,[[-100,0],[-75,-50]],'#b6a9aa',2);line(c,[[87,0],[58,-52]],'#b6a9aa',2);
    rect(c,71,-64,34,27,'#343149','#b89ca7',1);txt(c,'STAGE',88,-53,6,GOLD);txt(c,'13',88,-43,9,CREAM);
  }else if(type==='observatory'){
    rect(c,-67,-50,133,50,'#4b4866','#9794b4',2);ellipse(c,0,-51,69,50,'#5d5977','#a5a0bb',2);
    rect(c,-70,-54,140,8,'#333249');poly(c,[[-11,-98],[11,-98],[6,-50],[-6,-50]],'#b2a7b4');
    c.save();c.translate(2,-89);c.rotate(-.35+bob*.06);rect(c,-8,-9,65,18,'#89849e');ellipse(c,55,0,8,10,'#d6c8a5');c.restore();
    for(const x of [-43,0,43])rect(c,x-6,-31,12,18,'#27253e','#8d879e',1);
  }else if(type==='spaceopera'){
    for(const [x,y,dir] of [[-43,-73,1],[31,-99,-1]]){
      c.save();c.translate(x+bob*3,y+Math.sin(t*2+dir)*3);c.scale(dir,1);
      poly(c,[[-28,0],[-3,-9],[29,0],[-3,9]],'#adb8c5','#45475f',2);
      poly(c,[[-9,-19],[1,-4],[-9,0]],'#7884a0');poly(c,[[-9,19],[1,4],[-9,0]],'#7884a0');
      ellipse(c,3,0,4,3,GOLD,null);c.restore();
    }
    for(let j=0;j<3;j++)line(c,[[-15+j*14,-80+j*3],[-6+j*14,-82+j*3]],RED,1.3);
    rect(c,-50,-18,100,18,'#45425e','#8f8fa9',1);txt(c,'STARLIGHT MATINEE',0,-6,8,CREAM);
  }else if(type==='watertower'){
    for(const x of [-49,49])line(c,[[x,0],[x*.7,-83]],'#575773',5);
    ellipse(c,0,-82,61,18,'#646480','#aaa6bd',2);rect(c,-61,-126,122,45,'#5a5976','#aaa6bd',2);
    ellipse(c,0,-126,61,16,'#77728e','#aaa6bd',2);txt(c,'MIDNIGHT',0,-102,11,CREAM);
    line(c,[[60,-123],[81,-123],[81,-2]],'#a7a0b5',2);for(let y=-113;y<-4;y+=11)line(c,[[60,y],[81,y]],'#8c88a3',1);
    ellipse(c,0,-86,5,5,GOLD,null);
  }else if(type==='clown'){
    // Original distant clown silhouette; the single balloon is the movie nod.
    c.translate(0,-Math.max(0,bob)*6);
    ellipse(c,21+Math.sin(t*1.5)*4,-112+bob*4,10,13,RED,'#efaaa0',1.3);
    line(c,[[20,-99+bob*4],[15,-52],[10,-33]],'#a9a1a8',1);
    poly(c,[[-28,-17],[-18,-51],[-8,-60],[8,-59],[20,-17]],'#5c5370','#9387a1',1.5);
    ellipse(c,0,-69,10,12,'#d6b9b3','#65546b',1.5);
    ellipse(c,-8,-78,6,6,'#bd8b86',null);ellipse(c,8,-78,6,6,'#bd8b86',null);
    ellipse(c,0,-67,2,2,RED,null);line(c,[[-5,-62],[0,-60],[5,-62]],'#553f58',1.2);
    line(c,[[9,-51],[15,-52]],'#d6b9b3',2);line(c,[[-13,-15],[-16,-4]],'#544a61',4);line(c,[[13,-15],[16,-4]],'#544a61',4);
    rect(c,-37,-17,76,17,'#454058','#8e889d',1);txt(c,'SMILE',0,-5,8,CREAM);
  }else if(type==='usher'){
    ellipse(c,0,-35-Math.max(0,bob)*8,16,18,'#cbc6b0','#55546a',2);
    ellipse(c,-6,-38-Math.max(0,bob)*8,3,4,DARK,null);ellipse(c,6,-38-Math.max(0,bob)*8,3,4,DARK,null);
    poly(c,[[-22,-40],[0,-66],[23,-40]],'#57516b');rect(c,-24,-42,48,6,'#49475f');
    line(c,[[-9,-20],[-18,-5]],CREAM,3);line(c,[[9,-20],[18,-5]],CREAM,3);
    rect(c,-33,-14,67,14,'#58536b','#918aa0',1);txt(c,'TICKETS',0,-3,7,GOLD);
  }else if(type==='littleUfo'){
    c.globalAlpha=.28;poly(c,[[-2,-56],[-28,-3],[28,-3],[2,-56]],'#b0f4df',null);c.globalAlpha=1;
    ellipse(c,0,-76+bob*5,27,7,'#8f89aa','#bdb7c8',1);ellipse(c,0,-84+bob*5,13,10,'#9fd1bf','#d6edcd',1);
    ellipse(c,-13,-76+bob*5,2,2,GOLD,null);ellipse(c,13,-76+bob*5,2,2,GOLD,null);
    c.save();c.translate(0,-4-Math.max(0,bob)*15);c.rotate(bob*.12);
    poly(c,[[-14,0],[-12,-27],[-3,-35],[10,-32],[14,0]],'#6b6d83','#a3a1af',1);
    c.restore();
  }else if(type==='batSnack'){
    c.translate(0,-66+bob*4);
    const wing=Math.sin(t*7)*7;
    poly(c,[[-5,-5],[-24,-22-wing],[-45,-13-wing],[-29,4],[-13,3]],'#58506e');
    poly(c,[[5,-5],[24,-22-wing],[45,-13-wing],[29,4],[13,3]],'#58506e');
    ellipse(c,0,-3,11,10,'#5c5471');poly(c,[[-9,-10],[-7,-20],[0,-10],[7,-20],[9,-10]],'#5c5471');
    ellipse(c,-4,-4,2,2,GOLD,null);ellipse(c,4,-4,2,2,GOLD,null);
    rect(c,-7,7,14,12,RED);for(let j=-1;j<=1;j++)ellipse(c,j*5,6,4,4,'#f2dc9b',null,0);
  }
  c.restore();
}

const makeBackdrop = (id,name,stage,layer,u,kind,note,focusUp=60,zoom=2.1) => ({
  id,name,stage,layer,u,kind,note,when:'on',reach:180,focusUp,zoom,
  paint(c,f){if(f.stageIndex===stage)backdropArt(c,f,kind);},
});
export const CRYPT_MOVIE_BACKDROPS = [
  makeBackdrop('B2A','The monster drive-in',2,'bg',1300,'drivein','A flickering creature feature beyond a row of parked cars. Big new level-2 silhouette.',75),
  makeBackdrop('B2B','Moonlight carnival',2,'mid',1590,'carnival','Striped tent, glowing bulbs and a tiny stage entrance.',65),
  makeBackdrop('B2C','Last-room motel',2,'mid',1750,'motel','A crooked roadside motel with a sputtering vacancy sign.',63),
  makeBackdrop('B2D','Saucer on the hill',2,'mid',1950,'saucer','A friendly B-movie UFO briefly lights a grave marker.',60),
  makeBackdrop('B3A','Haunted studio backlot',3,'mid',2290,'backlot','Movie flats, braces and a STAGE 13 placard expose the joke.',64),
  makeBackdrop('B3B','Crooked observatory',3,'bg',2420,'observatory','A dome and giant telescope pull the skyline into a new shape.',100),
  makeBackdrop('B3C','Starlight matinee',3,'bg',2580,'spaceopera','Tiny original space-opera craft zip above a graveyard marquee.',82),
  makeBackdrop('B3D','Midnight water tower',3,'mid',2460,'watertower','A lanky tank, ladder and tiny warning light against the sky.',104),
];
export const CRYPT_MOVIE_MOMENTS = [
  makeBackdrop('M2A','Clown with one red balloon',2,'mid',1630,'clown','A comic distant cameo: peek, grin, balloon bob. An IT-era nod, with an original costume and face.',75,2.7),
  makeBackdrop('M2B','Skeleton ticket usher',2,'mid',1780,'usher','A little skull pops up behind a TICKETS slab and tips its hat.',50,3),
  makeBackdrop('M3A','The polite abduction',3,'mid',2310,'littleUfo','A toy-sized saucer lifts a headstone, thinks better of it and sets it down.',65,2.7),
  makeBackdrop('M3B','Bat at the movies',3,'mid',2480,'batSnack','A bat flutters across the hill carrying its own popcorn tub.',60,3),
];

function ideaCamX(item,at){
  const layer=GOUACHE_KIT.SCENE[item.layer], open=[0,.37,.71][item.stage-1];
  return (item.u-open*layer.period-at)/(layer.factor*ZOOM);
}
export function drawCryptMovieBackdrop(c,t,item,close=false){
  ready();
  const at=260, camX=ideaCamX(item,at);
  const bc={stageIndex:item.stage,progress:.28,cryptStudy:item,cryptLife:false};
  if(close){
    const L=GOUACHE_KIT.SCENE[item.layer],shift=camX*L.factor*ZOOM+[0,.37,.71][item.stage-1]*L.period;
    const crest=L.profile(at+shift,L.period),z=item.zoom;
    c.save();c.translate(240,165);c.scale(z,z);c.translate(-at,-(crest-item.focusUp));
    pack.bg(c,t,camX,crypt,1000,null,0,bc);c.restore();return;
  }
  c.save();pack.bg(c,t,camX,crypt,1000,null,0,bc);
  c.save();applyWorld(c,ZOOM,0,GROUND_Y);pack.ground(c,camX,crypt,[],[],t*60,VIEW_W);
  drawToon(c,'lorenzo',pose(t),PLAYER_X,GROUND_Y,HERO_DRAW_H);c.restore();c.restore();
}
