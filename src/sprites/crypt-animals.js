// Shared Crypt lane animal painters. The gallery and the shipped obstacle sprites
// use the same authored shapes and running cycle. Coordinates are a 100 x 70 canvas.
const I='rgba(26,16,40,.53)', S='rgba(26,16,40,.30)';
function make(c){
 const path=(fill,fn,stroke=S,lw=1.8)=>{c.beginPath();fn(c);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.lineJoin='round';c.stroke()}};
 const poly=(fill,pts,stroke=S,lw=1.8)=>path(fill,p=>{pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath()},stroke,lw);
 const oval=(fill,x,y,rx,ry,stroke=S,lw=1.8)=>path(fill,p=>p.ellipse(x,y,rx,ry,0,0,Math.PI*2),stroke,lw);
 const line=(color,w,pts)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke()};
 const limb=(color,w,pts)=>{line(I,w+2,pts);line(color,w,pts)};
 return {path,poly,oval,line,limb};
}
const BONE='#eee5c4';
function legs(c,t,pal,{cat=false,skeletal=false}={}){
 const q=make(c),g=Math.sin(t*(cat?8:7));
 for(const [x,offset,front] of [[29,0,false],[45,Math.PI,false],[64,Math.PI,true],[77,0,true]]){
  const swing=Math.sin(t*(cat?8:7)+offset)*5;
  const topY=cat?42:40, footX=x+swing+(front?-2:1);
  const jointX=x+(front?4:-5)-swing*.32;
  const lift=Math.max(0,Math.sin(t*(cat?8:7)+offset))*4;
  const near=(x===45||x===77),col=skeletal?(near?BONE:'#a1a99e'):(near?pal.base:pal.shadow);
  q.limb(col,cat?5.2:6.4,[[x,topY],[jointX,53-lift*.35],[footX,65-lift]]);
  q.oval(near?pal.paw:pal.shadow,footX-2,65-lift,6,2.8,null);
  if(skeletal){q.oval(BONE,jointX,53-lift*.35,2.7,2.7,null);q.line('#8c797b',1.5,[[jointX-1,52-lift*.35],[jointX+1,54-lift*.35]])}
 }
}
// The shipped dogs use a keyed gallop: the pairs do not march in lockstep,
// the feet lift on the return stroke, and the torso gathers between bounds.
// H3 and C3 use that same rhythm while keeping their own silhouettes.
function boundPose(t){
 const a=t*Math.PI*2*1.45;
 return {a,bob:-3.1*Math.max(0,Math.sin(a+.25))+.65*Math.cos(a*2),stretch:1+.07*Math.cos(a)};
}
function boundLegs(c,m,kind,near){
 const q=make(c),bone=kind==='grave';
 const pairs=near?[[33,0,true],[72,.48,false]]:[[39,.09,true],[77,.57,false]];
 for(const [rootX,offset,fore] of pairs){
  const a=m.a+offset*Math.PI*2;
  const lift=Math.max(0,Math.sin(a))*10.5;
  const footX=rootX+Math.cos(a)*11.5;
  const footY=64-lift-1.5*Math.max(0,Math.sin(m.a+.25));
  const kneeX=(rootX+footX)*.5+(fore?5:-6);
  const kneeY=50+m.bob*.45+lift*.12;
  const col=bone?(near?BONE:'#88909a'):(near?'#72547f':'#38324d');
  q.limb(col,near?6.2:5.2,[[rootX,39+m.bob],[kneeX,kneeY],[footX,footY]]);
  q.oval(bone?(near?'#e8dec2':'#858c96'):(near?'#634a72':'#302a42'),footX-2,footY,5.4,2.5,null);
  if(bone)q.oval(near?BONE:'#9ba2a6',kneeX,kneeY,2.3,2.3,null);
 }
}
function dog(c,t,kind){
 const q=make(c),g=Math.sin(t*7),wolf=kind==='feral',brute=kind==='warden';
 const p=wolf?{base:'#686e77',shadow:'#444955',highlight:'#aeb5ad',paw:'#34333e'}:
  brute?{base:'#a57656',shadow:'#704e49',highlight:'#d9ad78',paw:'#5b4548'}:
  {base:'#504c68',shadow:'#353247',highlight:'#8f83a3',paw:'#272535'};
 const height=brute?11:0;
 // Far silhouette, tail, then four independently moving legs.
 q.limb(p.shadow,brute?9:7,[[77,28+height],[89,18+height+g*3],[94,13+height+g*5]]);
 legs(c,t,p);
 q.path(p.base,x=>{x.moveTo(20,37+height);x.bezierCurveTo(30,20+height,50,22+height,62,26+height);x.bezierCurveTo(72,26+height,81,34+height,83,42+height);x.quadraticCurveTo(57,52+height,36,49+height);x.quadraticCurveTo(20,50+height,20,37+height);x.closePath()},S,2.2);
 q.path(p.highlight,x=>{x.moveTo(32,30+height);x.quadraticCurveTo(51,24+height,68,32+height);x.lineTo(62,36+height);x.quadraticCurveTo(45,31+height,32,35+height);x.closePath()},null);
 q.path(p.shadow,x=>{x.moveTo(30,44+height);x.quadraticCurveTo(47,52+height,74,42+height);x.lineTo(67,47+height);x.quadraticCurveTo(44,56+height,30,48+height);x.closePath()},null);
 if(wolf){
  for(let i=0;i<5;i++)q.poly(p.highlight,[[37+i*6,28],[41+i*6,19+i%2*2],[45+i*6,29]],null);
 }else if(kind==='shade'){
  q.line('#b19abc',1.4,[[40,29],[58,28],[72,35]]);
 }
 // Neck flows into head, rather than a separate outlined ball.
 q.path(p.base,x=>{x.moveTo(38,31+height);x.quadraticCurveTo(30,19+height,20,22+height);x.quadraticCurveTo(11,24+height,7,35+height);x.lineTo(19,46+height);x.quadraticCurveTo(30,44+height,38,31+height);x.closePath()},S,2);
 q.poly(p.shadow,[[26,25+height],[23,6+height],[13,18+height],[14,30+height]],S,2);
 q.poly(p.highlight,[[14,29+height],[10,11+height],[3,22+height],[7,32+height]],S,2);
 // Long dark muzzle and a small hinged jaw, with a readable negative mouth.
 q.path(p.highlight,x=>{x.moveTo(10,27+height);x.quadraticCurveTo(5,28+height,-1,35+height);x.lineTo(3,42+height);x.quadraticCurveTo(12,45+height,24,38+height);x.closePath()},S,1.8);
 q.path('#3b2939',x=>{x.moveTo(0,39+height);x.quadraticCurveTo(11,45+height,23,39+height);x.lineTo(15,48+height+g*.8);x.quadraticCurveTo(4,49+height+g*.8,0,43+height);x.closePath()},null);
 for(let i=0;i<3;i++)q.poly(BONE,[[4+i*5,41+height],[7+i*5,41+height],[6+i*5,45+height]],null);
 q.oval('#2a2532',1,34+height,3.7,2.4,null);
 q.oval('#fff5de',18,29+height,4.6,5,null);
 q.oval(kind==='shade'?'#e8a565':'#bf6265',16.5,29+height,2.2,2.8,null);
 q.line(I,2.5,[[12,23+height],[21,25+height]]);
 if(brute){q.line('#d6b784',4,[[26,34+height],[35,40+height]]);q.oval('#edc680',29,39+height,2,3,null)}
 if(kind==='shade'){q.oval('#b399bd',76,38,3,2,null);q.line('#bdabc2',1.5,[[36,25],[52,25]])}
}
function skeleton(c,t,kind,skipLegs=false){
 const q=make(c),g=Math.sin(t*7),armor=kind==='grave';
 const base=armor?'#55536b':kind==='ivory'?'#8b9d98':'#747581';
 const shadow=armor?'#343044':'#505864',hi=armor?'#aaa3b9':'#c1c8b0';
 q.limb(shadow,6,[[71,35],[88,28],[96,18+g*5]]);
 if(!skipLegs)legs(c,t,{base,shadow,highlight:hi,paw:shadow},{skeletal:true});
 q.path(shadow,x=>{x.moveTo(21,39);x.bezierCurveTo(31,22,57,23,75,36);x.quadraticCurveTo(79,49,62,49);x.lineTo(32,48);x.closePath()},S,1.8);
 q.path(base,x=>{x.moveTo(24,36);x.bezierCurveTo(38,25,58,26,71,35);x.lineTo(68,41);x.quadraticCurveTo(43,43,24,40);x.closePath()},null);
 if(kind==='ivory'){
  // A long, open runner rather than another shaded hound: the visible void
  // between shoulder and hip lets the ivory ribs form the whole middle.
  q.path('#303642',p=>{p.moveTo(34,33);p.quadraticCurveTo(46,30,64,34);p.lineTo(60,45);p.quadraticCurveTo(48,42,36,45);p.closePath()},null);
  q.poly(BONE,[[72,34],[83,29],[81,34],[70,38]],null);
  q.line(BONE,2.3,[[34,47],[48,49],[63,45]]);
 }
 q.line(hi,kind==='ivory'?4.3:3.3,[[25,31],[42,26],[60,28],[73,34]]);
 for(let i=0;i<5;i++){
  const x=36+i*7;
  q.path(armor?'#d9d2bd':BONE,p=>{p.moveTo(x,31);p.quadraticCurveTo(x+5,38,x+3,45);p.lineTo(x+7,43);p.quadraticCurveTo(x+9,35,x+4,29);p.closePath()},armor?S:null,.8);
 }
 if(armor)q.path(base,p=>{p.moveTo(43,29);p.quadraticCurveTo(64,25,75,35);p.lineTo(67,34);p.quadraticCurveTo(50,28,43,33);p.closePath()},S,1.5);
 if(skipLegs){c.save();c.translate(0,1.4*Math.sin(t*Math.PI*2*1.45+.6))}
 q.path(BONE,p=>{p.moveTo(24,22);p.quadraticCurveTo(11,17,7,28);p.lineTo(2,39);p.quadraticCurveTo(13,48,29,39);p.lineTo(35,30);p.closePath()},S,2);
 if(kind==='ivory')q.poly(BONE,[[20,22],[30,20],[27,29]],S,1.5);
 else q.poly(BONE,[[20,22],[22,9],[29,24]],S,1.5);
 q.poly(base,[[7,26],[6,14],[15,24]],S,1.5);
 q.path('#433542',p=>{p.moveTo(3,38);p.quadraticCurveTo(15,43,29,38);p.lineTo(25,49+g);p.quadraticCurveTo(10,51+g,2,44);p.closePath()},null);
 for(let i=0;i<3;i++)q.poly(BONE,[[6+i*6,40],[9+i*6,40],[8+i*6,45]],null);
 q.oval('#35313e',17,30,6,5,null);
 q.oval(kind==='ivory'?'#e6af69':'#be7584',15,30,2,2.5,null);
 q.line(I,2,[[10,23],[22,25]]);
 q.oval(shadow,3,35,2,1.5,null);
 if(kind==='ivory')q.line('#eee8cf',1.4,[[32,26],[50,22],[66,29]]);
 if(armor)q.poly('#a8a8b0',[[42,28],[50,25],[60,28],[55,31]],null);
 if(skipLegs)c.restore();
}
function cat(c,t,kind,skipLegs=false){
 const q=make(c),panther=kind!=='cat',g=Math.sin(t*9),shade=kind==='violet';
 const base=panther?(shade?'#5d456d':'#343641'):'#8c7289';
 const shadow=panther?(shade?'#322c47':'#222833'):'#604f69';
 const hi=panther?(shade?'#ab80b5':'#8f959d'):'#c1a6b3';
 const tailY=panther?11:5;
 const tailSwing=skipLegs?4*Math.sin(t*Math.PI*2*1.45-.8):0;
 q.path(shadow,p=>{p.moveTo(75,41);p.bezierCurveTo(87,39,91,25,89+tailSwing,tailY);p.bezierCurveTo(89+tailSwing,-3,96+tailSwing,4,96+tailSwing,13);p.lineTo(94+tailSwing,18);p.quadraticCurveTo(87,17,82,44);p.closePath()},S,2);
 if(!skipLegs)legs(c,t,{base,shadow,paw:shadow},{cat:true});
 q.path(base,p=>{p.moveTo(24,42);p.quadraticCurveTo(38,23,56,29);p.quadraticCurveTo(68,30,77,35);p.quadraticCurveTo(78,47,65,49);p.lineTo(35,49);p.closePath()},S,2);
 q.path(hi,p=>{p.moveTo(38,32);p.quadraticCurveTo(50,27,65,34);p.lineTo(59,35);p.quadraticCurveTo(48,31,38,36);p.closePath()},null);
 q.path(shadow,p=>{p.moveTo(24,42);p.quadraticCurveTo(45,49,72,40);p.lineTo(65,47);p.quadraticCurveTo(41,53,24,47);p.closePath()},null);
 if(skipLegs){c.save();c.translate(0,1.5*Math.sin(t*Math.PI*2*1.45+.4))}
 q.path(base,p=>{p.moveTo(34,35);p.quadraticCurveTo(31,23,17,23);p.quadraticCurveTo(5,28,5,39);p.lineTo(22,47);p.closePath()},S,1.8);
 q.poly(base,[[7,31],[6,11],[20,28]],S,1.8);q.poly(base,[[21,26],[28,10],[30,36]],S,1.8);
 q.poly(hi,[[9,25],[10,17],[16,27]],null);q.poly(hi,[[21,24],[26,17],[27,30]],null);
 q.path(hi,p=>{p.moveTo(5,37);p.quadraticCurveTo(-1,37,0,43);p.quadraticCurveTo(9,47,19,43);p.closePath()},null);
 q.oval('#fff4dc',14,32,5,4,null);q.oval(panther?'#e9b35d':'#e6c788',13,32,1.7,3,null);
 q.line(I,2.1,[[9,27],[19,29]]);q.oval('#352d38',0,41,2.2,1.8,null);
 q.line(hi,1.2,[[2,43],[-6,44]]);q.line(hi,1.1,[[4,45],[-4,48]]);
 if(panther){q.line(hi,1.2,[[36,31],[51,28],[64,32]]);q.oval(hi,54,47,3,1.5,null)}
 else {for(let i=0;i<3;i++)q.line(hi,1.2,[[32+i*11,35],[36+i*11,40]])}
 if(skipLegs)c.restore();
}

export function paintCryptAnimal(c,t,kind){
 if(kind==='grave'||kind==='violet'){
  const m=boundPose(t);
  boundLegs(c,m,kind,false);
  c.save();c.translate(50,m.bob);c.scale(m.stretch,1);c.translate(-50,0);
  if(kind==='grave')skeleton(c,t,kind,true);
  else cat(c,t,kind,true);
  c.restore();
  boundLegs(c,m,kind,true);
 }else if(kind==='moon'||kind==='ivory')skeleton(c,t,kind);
 else if(kind==='feral'||kind==='warden'||kind==='shade')dog(c,t,kind);
 else cat(c,t,kind);
}
