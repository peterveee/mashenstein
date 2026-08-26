// Gallery-only animated animal hazards. These are not registered gameplay
// entities: the sheet judges silhouette, motion and lane readability before a
// hitbox, spawn rule or damage contract is chosen.

const TAU = Math.PI * 2;
// Match the hero painter's shipped contour tone rather than the opaque prop
// ink used by the first animal pass. Dogs use the same 0.016-of-height outer
// contour as drawToon, then step down for seams and facial detail.
const DOG_OUTLINE = 'rgba(26,16,40,0.32)';
const DOG_SEAM = 'rgba(26,16,40,0.22)';
const DOG_FACE = 'rgba(26,16,40,0.72)';

function dogInk(w, h) {
  const u = Math.min(w, h);
  return {
    outer: Math.max(.28, u * .016),
    seam: Math.max(.18, u * .0085),
    detail: Math.max(.14, u * .0055),
  };
}

function shape(c, fill, stroke, width, draw) {
  c.beginPath();
  draw(c);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && width > 0) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function line(c, color, width, draw) {
  c.beginPath();
  draw(c);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function ellipse(c, x, y, rx, ry, fill, stroke = '#211722', width = 1, rotation = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && width > 0) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  c.restore();
}

function triangle(c, ax, ay, bx, by, cx, cy, fill, stroke = '#211722', width = 1) {
  shape(c, fill, stroke, width, (p) => {
    p.moveTo(ax, ay); p.lineTo(bx, by); p.lineTo(cx, cy);
  });
}

function limb(c, points, color, width, outline = '#211722') {
  line(c, outline, width + Math.max(0.7, width * 0.45), (p) => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
  });
  line(c, color, width, (p) => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
  });
}

function dogLimb(c, points, color, width, ink, highlight = null) {
  line(c, DOG_OUTLINE, width + ink.outer * 2, (p) => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
  });
  line(c, color, width, (p) => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
  });
  if (highlight) line(c, highlight, Math.max(ink.detail, width * .16), (p) => {
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) p.lineTo(points[i][0], points[i][1]);
  });
}

function dogPaw(c, x, y, rx, ry, fill, ink, direction = 1) {
  ellipse(c,x,y,rx,ry,fill,DOG_OUTLINE,ink.outer,0);
  for(let i=-1;i<=1;i++) line(c,DOG_FACE,ink.detail,(p)=>{
    const clawX=x+direction*rx*(.48+i*.18);
    p.moveTo(clawX,y+ry*.18);p.lineTo(clawX+direction*rx*.18,y+ry*.25);
  });
}

function eye(c, x, y, r, direction = 1, outlineWidth = null, outline = '#211722') {
  const ow = outlineWidth ?? Math.max(0.45, r * 0.55);
  ellipse(c, x, y, r * 1.35, r, '#fff4d2', outline, ow);
  ellipse(c, x + direction * r * 0.42, y, r * 0.48, r * 0.62, '#e83d4f', null, 0);
  ellipse(c, x + direction * r * 0.56, y, r * 0.2, r * 0.28, '#211722', null, 0);
  ellipse(c, x + direction * r * 0.72, y - r * .22, r * .12, r * .14, '#fff', null, 0);
}

function shadow(c, w, h, width = 0.62) {
  c.save();
  c.globalAlpha = 0.24;
  ellipse(c, w * 0.5, h * 0.91, w * width * 0.5, h * 0.055, '#0d1420', null, 0);
  c.restore();
}

function speedLines(c, w, h, phase, y = 0.48) {
  c.save();
  c.globalAlpha = 0.42;
  for (let i = 0; i < 3; i++) {
    const offset = ((phase * 0.09 + i * 0.13) % 0.14) * w;
    line(c, i === 1 ? '#f6d33c' : '#fff1b3', Math.max(0.45, w * 0.018), (p) => {
      p.moveTo(w * (0.03 + i * 0.035) - offset, h * (y + i * 0.12));
      p.lineTo(w * (0.22 + i * 0.035) - offset, h * (y + i * 0.12));
    });
  }
  c.restore();
}

function dust(c, w, h, phase) {
  c.save();
  c.globalAlpha = 0.36;
  for (let i = 0; i < 3; i++) {
    const age = (phase * 0.14 + i / 3) % 1;
    ellipse(c, w * (0.3 - age * 0.24), h * (0.84 - age * 0.08),
      w * (0.025 + age * 0.035), h * (0.025 + age * 0.03), '#ead7ad', null, 0);
  }
  c.restore();
}

function teeth(c, points, size, direction = 1, outlineWidth = null, outline = '#211722') {
  for (const [x, y] of points) {
    triangle(c, x - size * 0.55, y, x + size * 0.55, y,
      x, y + size * direction, '#fff6d6', outline,
      outlineWidth ?? Math.max(0.35, size * 0.22));
  }
}

function dogEye(c, x, y, r, direction, ink, pupil = '#e83d4f') {
  ellipse(c,x,y,r*1.32,r,'#fff7dc',DOG_FACE,ink.detail);
  ellipse(c,x+direction*r*.38,y,r*.46,r*.62,pupil,null,0);
  ellipse(c,x+direction*r*.5,y,r*.19,r*.3,'#1b1420',null,0);
  ellipse(c,x+direction*r*.62,y-r*.24,r*.13,r*.15,'#fff',null,0);
  line(c,DOG_FACE,ink.detail,(p)=>{
    p.moveTo(x-r*1.1,y-r*1.25);p.lineTo(x+r*.9,y-r*.7);
  });
}

function dogTeeth(c, points, size, direction, ink) {
  teeth(c,points,size,direction,ink.detail,DOG_FACE);
}

function drawViciousDog(c, w, h, t) {
  const run = t * 11;
  const gait = Math.sin(run);
  const bob = Math.abs(Math.sin(run)) * h * 0.028;
  const ink = dogInk(w,h);
  shadow(c, w, h, 0.68);
  speedLines(c, w, h, t * 3.2, 0.39);
  dust(c, w, h, t * 2.8);
  c.save(); c.translate(0, -bob);

  // Tail and running legs sit behind the torso.
  dogLimb(c, [[w*.28,h*.48],[w*.13,h*(.35 + gait*.025)],[w*.06,h*.42]],
    '#a85d35',h*.065,ink,'#d78a52');
  const legs = [
    [w*.34, h*.66, -gait], [w*.48, h*.68, gait],
    [w*.58, h*.66, gait], [w*.68, h*.65, -gait],
  ];
  for (const [x, y, swing] of legs) {
    const kneeX = x + swing * w * .055;
    const pawX = kneeX + swing*w*.035;
    dogLimb(c,[[x,y],[kneeX,h*.78],[pawX,h*.865]],'#a85d35',h*.058,ink,'#d78a52');
    dogPaw(c,pawX + (swing >= 0 ? w*.012 : -w*.012),h*.875,w*.045,h*.027,'#7e432f',ink,swing >= 0 ? 1 : -1);
  }

  ellipse(c,w*.48,h*.55,w*.245,h*.19,'#a85d35',DOG_OUTLINE,ink.outer,-.05);
  ellipse(c,w*.45,h*.5,w*.16,h*.095,'#c97843',null,0,-.08);
  ellipse(c,w*.52,h*.64,w*.14,h*.065,'#8f4934',null,0,-.04);
  line(c,DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.34,h*.49);p.quadraticCurveTo(w*.45,h*.44,w*.57,h*.46);
    p.moveTo(w*.4,h*.62);p.quadraticCurveTo(w*.5,h*.67,w*.6,h*.62);
  });
  // Raised hackles make the back dangerous before the face is resolved.
  for (let i = 0; i < 4; i++) {
    const x = w * (.31 + i*.09);
    triangle(c, x-w*.035,h*.41, x+w*.035,h*.4, x,h*(.28-i*.012),
      i % 2 ? '#8d3e2e' : '#c36c38', DOG_OUTLINE, ink.outer);
    line(c,'rgba(255,205,120,.55)',ink.detail,(p)=>{p.moveTo(x,h*.36);p.lineTo(x,h*(.3-i*.01));});
  }
  ellipse(c,w*.71,h*.5,w*.18,h*.18,'#b86739',DOG_OUTLINE,ink.outer,.05);
  ellipse(c,w*.69,h*.46,w*.105,h*.08,'#d4864b',null,0,-.05);
  triangle(c,w*.61,h*.39,w*.66,h*.22,w*.73,h*.4,'#713043',DOG_OUTLINE,ink.outer);
  triangle(c,w*.71,h*.37,w*.8,h*.22,w*.82,h*.43,'#713043',DOG_OUTLINE,ink.outer);
  triangle(c,w*.64,h*.36,w*.67,h*.26,w*.71,h*.38,'#c5796a',DOG_SEAM,ink.seam);
  triangle(c,w*.74,h*.35,w*.79,h*.26,w*.8,h*.39,'#c5796a',DOG_SEAM,ink.seam);
  // Open black mouth, white teeth and a forward-pointing muzzle.
  shape(c,'#351a24',DOG_OUTLINE,ink.outer,(p) => {
    p.moveTo(w*.72,h*.53); p.quadraticCurveTo(w*.87,h*.48,w*.96,h*.57);
    p.quadraticCurveTo(w*.88,h*.7,w*.72,h*.64);
  });
  shape(c,'#c94754',null,0,(p)=>{p.moveTo(w*.78,h*.63);p.quadraticCurveTo(w*.86,h*.68,w*.91,h*.62);p.lineTo(w*.82,h*.61);});
  ellipse(c,w*.93,h*.52,w*.055,h*.045,'#211722',DOG_FACE,ink.detail);
  ellipse(c,w*.915,h*.505,w*.014,h*.01,'#fff',null,0);
  dogTeeth(c,[[w*.79,h*.54],[w*.86,h*.54],[w*.91,h*.56]],h*.055,1,ink);
  dogTeeth(c,[[w*.82,h*.65],[w*.89,h*.63]],h*.05,-1,ink);
  dogEye(c,w*.78,h*.44,h*.035,1,ink);
  shape(c,'#ef445b',DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.59,h*.525);p.lineTo(w*.685,h*.585);p.lineTo(w*.665,h*.64);p.lineTo(w*.575,h*.575);
  });
  ellipse(c,w*.615,h*.59,h*.025,h*.025,'#f6d33c',DOG_SEAM,ink.detail);
  line(c,'rgba(255,225,170,.7)',ink.detail,(p)=>{
    p.moveTo(w*.59,h*.46);p.lineTo(w*.64,h*.44);p.moveTo(w*.58,h*.49);p.lineTo(w*.63,h*.49);
  });
  c.restore();
}

function drawBulldog(c, w, h, t) {
  const run = t * 9.2;
  const gait = Math.sin(run);
  const bob = Math.abs(gait) * h * .018;
  const ink = dogInk(w,h);
  shadow(c,w,h,.72); speedLines(c,w,h,t*2.4,.42); dust(c,w,h,t*2.1);
  c.save(); c.translate(0,-bob);
  dogLimb(c,[[w*.3,h*.54],[w*.17,h*.45],[w*.12,h*.54]],'#9b593c',h*.055,ink,'#d2875d');
  for(const [x,s] of [[.37,gait],[.51,-gait],[.62,-gait],[.72,gait]]){
    const pawX=w*(x+s*.04);
    dogLimb(c,[[w*x,h*.67],[w*(x+s*.025),h*.79],[pawX,h*.855]],'#a56242',h*.085,ink,'#d58c62');
    dogPaw(c,pawX,h*.875,w*.05,h*.03,'#7b4436',ink,s>=0?1:-1);
  }
  ellipse(c,w*.49,h*.58,w*.28,h*.2,'#a56242',DOG_OUTLINE,ink.outer);
  ellipse(c,w*.43,h*.53,w*.16,h*.095,'#c97c52',null,0,-.06);
  ellipse(c,w*.51,h*.67,w*.16,h*.055,'#8b4d3d',null,0);
  line(c,DOG_SEAM,ink.seam,(p)=>{p.moveTo(w*.32,h*.51);p.quadraticCurveTo(w*.47,h*.45,w*.61,h*.5);});
  // The bulldog's collar widens the neck into a hard, spiked barrier.
  shape(c,'#e34255',DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.61,h*.43);p.lineTo(w*.66,h*.42);p.lineTo(w*.71,h*.68);p.lineTo(w*.65,h*.69);
  });
  for(const y of [.48,.57,.66]) triangle(c,w*.64,h*y,w*.68,h*(y-.025),w*.61,h*(y-.07),'#d9dce4',DOG_SEAM,ink.detail);
  ellipse(c,w*.74,h*.54,w*.21,h*.235,'#b56f4c',DOG_OUTLINE,ink.outer,.03);
  ellipse(c,w*.71,h*.45,w*.12,h*.1,'#d58b60',null,0);
  triangle(c,w*.61,h*.42,w*.63,h*.28,w*.72,h*.41,'#713746',DOG_OUTLINE,ink.outer);
  triangle(c,w*.73,h*.38,w*.82,h*.28,w*.84,h*.45,'#713746',DOG_OUTLINE,ink.outer);
  triangle(c,w*.64,h*.39,w*.65,h*.31,w*.7,h*.4,'#c57b72',DOG_SEAM,ink.seam);
  triangle(c,w*.76,h*.37,w*.81,h*.31,w*.82,h*.42,'#c57b72',DOG_SEAM,ink.seam);
  // Square jowls and the underbite are the breed read and the danger read.
  shape(c,'#5a3030',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.73,h*.5);p.lineTo(w*.94,h*.49);p.lineTo(w*.99,h*.61);
    p.lineTo(w*.91,h*.72);p.lineTo(w*.72,h*.69);
  });
  ellipse(c,w*.95,h*.51,w*.055,h*.045,'#211722',DOG_FACE,ink.detail);
  ellipse(c,w*.935,h*.497,w*.013,h*.01,'#fff',null,0);
  shape(c,'#341924',DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.75,h*.59);p.lineTo(w*.96,h*.6);p.lineTo(w*.91,h*.72);p.lineTo(w*.76,h*.7);
  });
  shape(c,'#ce4e59',null,0,(p)=>{p.moveTo(w*.8,h*.69);p.lineTo(w*.9,h*.68);p.lineTo(w*.86,h*.72);});
  dogTeeth(c,[[w*.81,h*.6],[w*.89,h*.6],[w*.94,h*.61]],h*.055,1,ink);
  dogTeeth(c,[[w*.82,h*.7],[w*.9,h*.7]],h*.055,-1,ink);
  dogEye(c,w*.78,h*.47,h*.036,1,ink);
  // Brow folds and cheek crease give the square head more anatomy at detail size.
  line(c,DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.69,h*.43);p.quadraticCurveTo(w*.75,h*.39,w*.81,h*.42);
    p.moveTo(w*.72,h*.55);p.quadraticCurveTo(w*.69,h*.62,w*.73,h*.67);
    p.moveTo(w*.84,h*.54);p.lineTo(w*.9,h*.55);
  });
  c.restore();
}

function drawDoberman(c, w, h, t) {
  const run=t*12.2;
  const gait=Math.sin(run);
  const bob=Math.abs(gait)*h*.026;
  const ink=dogInk(w,h);
  shadow(c,w,h,.66);speedLines(c,w,h,t*3.5,.34);dust(c,w,h,t*3);
  c.save();c.translate(0,-bob);
  dogLimb(c,[[w*.31,h*.45],[w*.14,h*.3],[w*.09,h*.42]],'#281f28',h*.045,ink,'#55505b');
  for(const [x,s] of [[.34,gait],[.48,-gait],[.59,-gait],[.69,gait]]){
    const knee=x+s*.055;
    const pawX=w*(knee+s*.045);
    dogLimb(c,[[w*x,h*.56],[w*knee,h*.73],[pawX,h*.87]],'#2b2229',h*.052,ink,'#55505b');
    // Rust stockings break the long black legs into readable joints.
    ellipse(c,w*knee,h*.74,w*.028,h*.05,'#a55437',null,0);
    dogPaw(c,pawX,h*.885,w*.04,h*.022,'#b9663e',ink,s>=0?1:-1);
  }
  ellipse(c,w*.49,h*.46,w*.25,h*.15,'#292128',DOG_OUTLINE,ink.outer,-.06);
  ellipse(c,w*.43,h*.415,w*.14,h*.062,'#46404a',null,0,-.1);
  line(c,DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.34,h*.42);p.quadraticCurveTo(w*.47,h*.37,w*.59,h*.4);
    p.moveTo(w*.38,h*.5);p.quadraticCurveTo(w*.49,h*.55,w*.6,h*.49);
  });
  ellipse(c,w*.59,h*.5,w*.09,h*.1,'#a55437',null,0,-.1);
  // Long neck and narrow head make a fast, spear-like silhouette.
  shape(c,'#292128',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.62,h*.49);p.lineTo(w*.67,h*.3);p.lineTo(w*.79,h*.32);p.lineTo(w*.76,h*.54);
  });
  ellipse(c,w*.78,h*.36,w*.15,h*.13,'#30242a',DOG_OUTLINE,ink.outer,.03);
  ellipse(c,w*.75,h*.33,w*.085,h*.055,'#4a424b',null,0);
  triangle(c,w*.68,h*.3,w*.68,h*.08,w*.76,h*.27,'#30242a',DOG_OUTLINE,ink.outer);
  triangle(c,w*.77,h*.26,w*.84,h*.06,w*.86,h*.31,'#30242a',DOG_OUTLINE,ink.outer);
  triangle(c,w*.7,h*.27,w*.7,h*.12,w*.75,h*.27,'#8a554f',DOG_SEAM,ink.seam);
  triangle(c,w*.79,h*.25,w*.84,h*.1,w*.84,h*.29,'#8a554f',DOG_SEAM,ink.seam);
  shape(c,'#3b2528',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.78,h*.34);p.lineTo(w*.98,h*.39);p.lineTo(w*.94,h*.52);p.lineTo(w*.76,h*.48);
  });
  ellipse(c,w*.97,h*.4,w*.038,h*.035,'#101116',DOG_FACE,ink.detail);
  ellipse(c,w*.96,h*.39,w*.01,h*.009,'#fff',null,0);
  shape(c,'#301722',DOG_SEAM,ink.seam,(p)=>{p.moveTo(w*.79,h*.42);p.lineTo(w*.95,h*.45);p.lineTo(w*.88,h*.53);});
  dogTeeth(c,[[w*.84,h*.44],[w*.9,h*.45]],h*.048,1,ink);
  dogEye(c,w*.82,h*.33,h*.03,1,ink);
  shape(c,'#e34255',DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.64,h*.395);p.lineTo(w*.67,h*.39);p.lineTo(w*.75,h*.49);p.lineTo(w*.71,h*.52);
  });
  ellipse(c,w*.69,h*.46,h*.022,h*.022,'#f6d33c',DOG_SEAM,ink.detail);
  line(c,'rgba(190,112,75,.72)',ink.detail,(p)=>{
    p.moveTo(w*.8,h*.38);p.lineTo(w*.9,h*.4);p.moveTo(w*.7,h*.35);p.lineTo(w*.74,h*.34);
  });
  c.restore();
}

function drawWolfhound(c, w, h, t) {
  const run=t*8.8;
  const gait=Math.sin(run);
  const bob=Math.abs(gait)*h*.025;
  const ink=dogInk(w,h);
  shadow(c,w,h,.72);speedLines(c,w,h,t*2.5,.4);dust(c,w,h,t*2.2);
  c.save();c.translate(0,-bob);
  // Bushy tail and shaggy body keep the silhouette distinct from the clean dogs.
  shape(c,'#626374',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.31,h*.5);p.quadraticCurveTo(w*.13,h*.34,w*.04,h*.49);
    p.lineTo(w*.14,h*.51);p.lineTo(w*.06,h*.62);p.quadraticCurveTo(w*.2,h*.58,w*.34,h*.61);
  });
  line(c,'#888a99',ink.seam,(p)=>{p.moveTo(w*.29,h*.5);p.quadraticCurveTo(w*.17,h*.41,w*.08,h*.48);});
  for(const [x,s] of [[.36,gait],[.5,-gait],[.61,-gait],[.7,gait]]){
    const pawX=w*(x+s*.07);
    dogLimb(c,[[w*x,h*.65],[w*(x+s*.04),h*.78],[pawX,h*.865]],'#555665',h*.06,ink,'#7e7f8e');
    dogPaw(c,pawX,h*.88,w*.045,h*.025,'#454652',ink,s>=0?1:-1);
  }
  shape(c,'#626374',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.25,h*.49);p.lineTo(w*.31,h*.38);p.lineTo(w*.38,h*.43);p.lineTo(w*.43,h*.32);
    p.lineTo(w*.5,h*.42);p.lineTo(w*.58,h*.34);p.lineTo(w*.64,h*.46);p.lineTo(w*.72,h*.43);
    p.lineTo(w*.76,h*.65);p.lineTo(w*.65,h*.72);p.lineTo(w*.28,h*.69);
  });
  shape(c,'#7b7d8c',null,0,(p)=>{
    p.moveTo(w*.31,h*.47);p.lineTo(w*.38,h*.42);p.lineTo(w*.44,h*.46);p.lineTo(w*.5,h*.39);
    p.lineTo(w*.55,h*.46);p.lineTo(w*.61,h*.42);p.lineTo(w*.65,h*.52);p.lineTo(w*.6,h*.56);p.lineTo(w*.34,h*.56);
  });
  for(let i=0;i<4;i++) line(c,DOG_SEAM,ink.detail,(p)=>{
    const x=w*(.34+i*.075);p.moveTo(x,h*.48);p.lineTo(x+w*.035,h*.56);
  });
  // A jagged mane frames the head like a second set of teeth.
  shape(c,'#464654',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.61,h*.43);p.lineTo(w*.66,h*.29);p.lineTo(w*.71,h*.37);p.lineTo(w*.77,h*.22);
    p.lineTo(w*.81,h*.39);p.lineTo(w*.9,h*.38);p.lineTo(w*.87,h*.66);p.lineTo(w*.68,h*.68);
  });
  ellipse(c,w*.78,h*.48,w*.16,h*.16,'#686979',DOG_OUTLINE,ink.outer);
  ellipse(c,w*.75,h*.44,w*.09,h*.065,'#858796',null,0);
  triangle(c,w*.68,h*.38,w*.69,h*.19,w*.77,h*.36,'#565766',DOG_OUTLINE,ink.outer);
  triangle(c,w*.77,h*.34,w*.85,h*.17,w*.88,h*.42,'#565766',DOG_OUTLINE,ink.outer);
  triangle(c,w*.71,h*.35,w*.71,h*.23,w*.76,h*.35,'#878390',DOG_SEAM,ink.seam);
  triangle(c,w*.8,h*.33,w*.84,h*.21,w*.86,h*.39,'#878390',DOG_SEAM,ink.seam);
  shape(c,'#30242c',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.76,h*.49);p.lineTo(w*.98,h*.52);p.lineTo(w*.93,h*.66);p.lineTo(w*.74,h*.61);
  });
  ellipse(c,w*.97,h*.52,w*.04,h*.035,'#15141a',DOG_FACE,ink.detail);
  ellipse(c,w*.96,h*.51,w*.01,h*.008,'#fff',null,0);
  dogTeeth(c,[[w*.82,h*.53],[w*.89,h*.54],[w*.94,h*.55]],h*.055,1,ink);
  dogTeeth(c,[[w*.85,h*.63],[w*.92,h*.64]],h*.05,-1,ink);
  dogEye(c,w*.81,h*.45,h*.032,1,ink);
  line(c,DOG_SEAM,ink.seam,(p)=>{
    p.moveTo(w*.7,h*.45);p.lineTo(w*.75,h*.48);p.moveTo(w*.69,h*.53);p.lineTo(w*.73,h*.57);
    p.moveTo(w*.77,h*.61);p.lineTo(w*.83,h*.63);
  });
  c.restore();
}

function drawHellhound(c, w, h, t) {
  const run=t*10.6;
  const gait=Math.sin(run);
  const pulse=.5+.5*Math.sin(t*5.3);
  const ink=dogInk(w,h);
  shadow(c,w,h,.7);
  c.save();c.globalAlpha=.42;
  speedLines(c,w,h,t*3,.36);
  for(let i=0;i<3;i++) ellipse(c,w*(.23-i*.07),h*(.74-i*.05),w*.025,h*.03,i===1?'#ffd05a':'#ef4b3f',null,0);
  c.restore();
  c.save();c.translate(0,-Math.abs(gait)*h*.025);
  // Flame tail: wide at the base, forked at the hot end.
  shape(c,'#ef4b3f',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.33,h*.53);p.quadraticCurveTo(w*.18,h*.36,w*.06,h*.43);
    p.lineTo(w*.13,h*.3);p.lineTo(w*.02,h*.34);p.lineTo(w*.09,h*.2);
    p.quadraticCurveTo(w*.22,h*.28,w*.37,h*.46);
  });
  shape(c,'#ffd05a',null,0,(p)=>{
    p.moveTo(w*.29,h*.49);p.quadraticCurveTo(w*.18,h*.4,w*.1,h*.42);
    p.lineTo(w*.15,h*.35);p.lineTo(w*.09,h*.36);p.lineTo(w*.14,h*.29);p.quadraticCurveTo(w*.22,h*.35,w*.33,h*.46);
  });
  for(const [x,s] of [[.36,gait],[.5,-gait],[.62,-gait],[.71,gait]]){
    const pawX=w*(x+s*.07);
    dogLimb(c,[[w*x,h*.65],[w*(x+s*.04),h*.79],[pawX,h*.865]],'#30232d',h*.058,ink,'#564151');
    dogPaw(c,pawX,h*.88,w*.044,h*.025,'#1c1720',ink,s>=0?1:-1);
    triangle(c,w*(x-.035),h*.72,w*(x+.035),h*.72,w*x,h*(.62-.04*pulse),'#ef4b3f',DOG_SEAM,ink.seam);
  }
  ellipse(c,w*.5,h*.55,w*.27,h*.19,'#30232d',DOG_OUTLINE,ink.outer,-.04);
  ellipse(c,w*.45,h*.5,w*.16,h*.085,'#493545',null,0,-.05);
  ellipse(c,w*.52,h*.64,w*.13,h*.05,'#201922',null,0);
  line(c,'#ff6a42',ink.seam,(p)=>{
    p.moveTo(w*.37,h*.5);p.lineTo(w*.43,h*.56);p.lineTo(w*.49,h*.49);p.lineTo(w*.55,h*.58);p.lineTo(w*.61,h*.51);
  });
  for(let i=0;i<6;i++){
    const x=w*(.29+i*.075);
    triangle(c,x-w*.03,h*.41,x+w*.035,h*.4,x,h*(.22+(i%2)*.04),
      i%2?'#ffb43f':'#ef4b3f',DOG_OUTLINE,ink.outer);
    if(i%2) line(c,'#fff09a',ink.detail,(p)=>{p.moveTo(x,h*.37);p.lineTo(x,h*(.27+(i%2)*.035));});
  }
  ellipse(c,w*.73,h*.48,w*.18,h*.18,'#392631',DOG_OUTLINE,ink.outer);
  ellipse(c,w*.7,h*.44,w*.1,h*.065,'#553844',null,0);
  triangle(c,w*.61,h*.38,w*.64,h*.2,w*.72,h*.38,'#ef4b3f',DOG_OUTLINE,ink.outer);
  triangle(c,w*.73,h*.35,w*.82,h*.18,w*.84,h*.41,'#ef4b3f',DOG_OUTLINE,ink.outer);
  triangle(c,w*.64,h*.35,w*.65,h*.24,w*.7,h*.37,'#ffb43f',DOG_SEAM,ink.seam);
  triangle(c,w*.76,h*.33,w*.81,h*.22,w*.82,h*.39,'#ffb43f',DOG_SEAM,ink.seam);
  shape(c,'#1c151c',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.72,h*.48);p.lineTo(w*.98,h*.5);p.lineTo(w*.92,h*.66);p.lineTo(w*.71,h*.61);
  });
  ellipse(c,w*.97,h*.5,w*.045,h*.038,'#0c0d11',DOG_FACE,ink.detail);
  ellipse(c,w*.955,h*.49,w*.012,h*.009,'#fff',null,0);
  dogTeeth(c,[[w*.79,h*.51],[w*.86,h*.52],[w*.93,h*.52]],h*.06,1,ink);
  dogTeeth(c,[[w*.83,h*.62],[w*.91,h*.63]],h*.052,-1,ink);
  dogEye(c,w*.79,h*.43,h*.038,1,ink,pulse>.55?'#fff3a0':'#ff5a40');
  shape(c,'#ff6a42',null,0,(p)=>{p.moveTo(w*.78,h*.62);p.lineTo(w*.9,h*.62);p.lineTo(w*.84,h*.66);});
  for(let i=0;i<3;i++) ellipse(c,w*(.4+i*.075),h*(.58+(i%2)*.04),h*.012,h*.012,i===1?'#ffd05a':'#ef4b3f',null,0);
  c.restore();
}

function drawCyberK9(c, w, h, t) {
  const run=t*11.5;
  const gait=Math.sin(run);
  const pulse=.5+.5*Math.sin(t*7);
  const ink=dogInk(w,h);
  shadow(c,w,h,.68);speedLines(c,w,h,t*3.2,.38);
  c.save();c.globalAlpha=.55;
  for(let i=0;i<3;i++) line(c,i===1?'#ff536a':'#67e6ff',Math.max(.4,h*.02),(p)=>{
    const x=w*(.2-i*.055),y=h*(.72-i*.07);p.moveTo(x,y);p.lineTo(x-w*.045,y+h*.025);
  });
  c.restore();
  c.save();c.translate(0,-Math.abs(gait)*h*.02);
  // Cable tail and piston legs give the mechanical read before panel detail.
  line(c,DOG_OUTLINE,h*.055+ink.outer*2,(p)=>{p.moveTo(w*.31,h*.5);p.quadraticCurveTo(w*.14,h*.31,w*.06,h*.45);});
  line(c,'#64dff2',h*.035,(p)=>{p.moveTo(w*.3,h*.49);p.quadraticCurveTo(w*.15,h*.34,w*.07,h*.44);});
  ellipse(c,w*.065,h*.445,w*.025,h*.025,'#ff536a',DOG_OUTLINE,ink.detail);
  for(const [x,s] of [[.37,gait],[.5,-gait],[.62,-gait],[.71,gait]]){
    const kneeX=w*(x+s*.04), pawX=w*(x+s*.065);
    dogLimb(c,[[w*x,h*.64],[kneeX,h*.76],[pawX,h*.865]],'#6f7f8f',h*.052,ink,'#b8cad7');
    ellipse(c,kneeX,h*.76,w*.035,h*.035,'#ef4d61',DOG_OUTLINE,ink.detail);
    dogPaw(c,pawX,h*.88,w*.04,h*.024,'#4f5e6c',ink,s>=0?1:-1);
  }
  shape(c,'#677889',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.27,h*.44);p.lineTo(w*.55,h*.37);p.lineTo(w*.7,h*.45);p.lineTo(w*.68,h*.69);
    p.lineTo(w*.34,h*.71);p.lineTo(w*.23,h*.59);
  });
  shape(c,'rgba(196,220,232,.38)',null,0,(p)=>{
    p.moveTo(w*.3,h*.46);p.lineTo(w*.51,h*.41);p.lineTo(w*.59,h*.45);p.lineTo(w*.55,h*.51);p.lineTo(w*.33,h*.55);
  });
  line(c,DOG_SEAM,ink.seam,(p)=>{p.moveTo(w*.39,h*.4);p.lineTo(w*.42,h*.69);p.moveTo(w*.57,h*.4);p.lineTo(w*.59,h*.67);});
  line(c,'#c6d8e4',ink.detail,(p)=>{p.moveTo(w*.4,h*.42);p.lineTo(w*.43,h*.67);p.moveTo(w*.58,h*.42);p.lineTo(w*.6,h*.64);});
  ellipse(c,w*.45,h*.53,w*.045,h*.045,pulse>.55?'#67f0ff':'#298fa8',DOG_FACE,ink.detail);
  ellipse(c,w*.435,h*.515,w*.012,h*.012,'#eaffff',null,0);
  shape(c,'#7f8e9c',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.65,h*.38);p.lineTo(w*.83,h*.34);p.lineTo(w*.9,h*.46);p.lineTo(w*.84,h*.63);p.lineTo(w*.65,h*.61);
  });
  shape(c,'rgba(205,224,235,.42)',null,0,(p)=>{p.moveTo(w*.68,h*.4);p.lineTo(w*.8,h*.37);p.lineTo(w*.85,h*.43);p.lineTo(w*.74,h*.45);});
  triangle(c,w*.67,h*.38,w*.68,h*.2,w*.77,h*.35,'#8999a7',DOG_OUTLINE,ink.outer);
  triangle(c,w*.78,h*.34,w*.86,h*.19,w*.87,h*.41,'#8999a7',DOG_OUTLINE,ink.outer);
  triangle(c,w*.7,h*.35,w*.7,h*.24,w*.75,h*.35,'#b7c6d0',DOG_SEAM,ink.seam);
  triangle(c,w*.81,h*.33,w*.85,h*.23,w*.85,h*.39,'#b7c6d0',DOG_SEAM,ink.seam);
  shape(c,'#24242d',DOG_OUTLINE,ink.outer,(p)=>{
    p.moveTo(w*.8,h*.44);p.lineTo(w*.99,h*.45);p.lineTo(w*.94,h*.62);p.lineTo(w*.8,h*.6);
  });
  ellipse(c,w*.98,h*.45,w*.035,h*.032,'#101117',DOG_FACE,ink.detail);
  ellipse(c,w*.97,h*.44,w*.009,h*.008,'#fff',null,0);
  dogTeeth(c,[[w*.84,h*.46],[w*.89,h*.46],[w*.94,h*.46]],h*.05,1,ink);
  dogTeeth(c,[[w*.86,h*.6],[w*.92,h*.6]],h*.046,-1,ink);
  dogEye(c,w*.82,h*.4,h*.036,1,ink,'#ff536a');
  line(c,'#ff536a',ink.seam,(p)=>{p.moveTo(w*.69,h*.55);p.lineTo(w*.77,h*.55);});
  // Fasteners and panel vents survive only in the enlarged study, as intended.
  for(const [x,y] of [[.3,.54],[.36,.65],[.62,.48],[.64,.61]]){
    ellipse(c,w*x,h*y,h*.011,h*.011,'#d8e4ec',DOG_SEAM,ink.detail*.75);
  }
  for(let i=0;i<3;i++) line(c,'#34414c',ink.detail,(p)=>{p.moveTo(w*(.5+i*.025),h*.57);p.lineTo(w*(.5+i*.025),h*.63);});
  c.restore();
}

function drawChargingBoar(c, w, h, t) {
  const run = t * 9.5;
  const gait = Math.sin(run);
  const bob = Math.abs(gait) * h * .025;
  const ink = Math.max(.8, Math.min(w,h)*.055);
  shadow(c,w,h,.72); speedLines(c,w,h,t*2.7,.37); dust(c,w,h,t*2.4);
  c.save(); c.translate(0,-bob);
  limb(c,[[w*.25,h*.53],[w*.12,h*.46],[w*.08,h*.56]],'#63413a',h*.055,'#211722');
  for (const [x,s] of [[.34,gait],[.5,-gait],[.61,-gait],[.72,gait]]) {
    limb(c,[[w*x,h*.66],[w*(x+s*.04),h*.79],[w*(x+s*.065),h*.88]],'#5c3c37',h*.075,'#211722');
  }
  ellipse(c,w*.47,h*.55,w*.29,h*.21,'#63413a','#211722',ink,-.04);
  for(let i=0;i<7;i++){
    const x=w*(.24+i*.07);
    triangle(c,x-w*.025,h*.39,x+w*.03,h*.39,x-w*.005,h*(.23+(i%2)*.035),
      i%2?'#382833':'#4c3033','#211722',ink*.45);
  }
  ellipse(c,w*.72,h*.55,w*.2,h*.2,'#71483e','#211722',ink,.08);
  ellipse(c,w*.87,h*.58,w*.105,h*.09,'#a06a5d','#211722',ink*.7);
  ellipse(c,w*.9,h*.57,w*.018,h*.023,'#271a20',null,0);
  eye(c,w*.76,h*.47,h*.033,1);
  // The tusks are the first-read silhouette and remain white at lane scale.
  shape(c,'#fff0c5','#211722',ink*.65,(p)=>{
    p.moveTo(w*.82,h*.61);p.quadraticCurveTo(w*.92,h*.75,w*.99,h*.59);
    p.quadraticCurveTo(w*.92,h*.67,w*.86,h*.57);
  });
  shape(c,'#fff0c5','#211722',ink*.6,(p)=>{
    p.moveTo(w*.76,h*.62);p.quadraticCurveTo(w*.82,h*.75,w*.9,h*.62);
    p.quadraticCurveTo(w*.83,h*.68,w*.8,h*.57);
  });
  c.restore();
}

function drawSewerCroc(c, w, h, t) {
  const scuttle = Math.sin(t*10);
  const gape = .5 + .5*Math.sin(t*4.2);
  const ink = Math.max(.75,Math.min(w,h)*.06);
  shadow(c,w,h,.78); speedLines(c,w,h,t*2.4,.48);
  // Tail is a heavy taper rather than a harmless line.
  shape(c,'#397b53','#17231e',ink,(p)=>{
    p.moveTo(w*.53,h*.56);p.quadraticCurveTo(w*.28,h*.41,w*.04,h*.61);
    p.quadraticCurveTo(w*.26,h*.58,w*.49,h*.72);
  });
  for(const [x,s] of [[.38,scuttle],[.56,-scuttle]]){
    limb(c,[[w*x,h*.69],[w*(x+s*.035),h*.82],[w*(x+s*.085),h*.87]],'#397b53',h*.07,'#17231e');
  }
  ellipse(c,w*.52,h*.6,w*.29,h*.18,'#438c5c','#17231e',ink,-.02);
  for(let i=0;i<5;i++){
    const x=w*(.31+i*.09);
    triangle(c,x-w*.025,h*.46,x+w*.035,h*.45,x,h*(.34-(i%2)*.025),'#91b34f','#17231e',ink*.42);
  }
  // Separate jaws make the snap visible in a still and in motion.
  const jaw = .025 + .08 * gape;
  shape(c,'#4a9c61','#17231e',ink,(p)=>{
    p.moveTo(w*.61,h*.52);p.lineTo(w*.98,h*(.48-jaw));p.lineTo(w*.91,h*.59);p.lineTo(w*.61,h*.62);
  });
  shape(c,'#356f4c','#17231e',ink,(p)=>{
    p.moveTo(w*.61,h*.64);p.lineTo(w*.95,h*(.69+jaw));p.lineTo(w*.86,h*.75);p.lineTo(w*.59,h*.72);
  });
  shape(c,'#7d2438',null,0,(p)=>{
    p.moveTo(w*.65,h*.62);p.lineTo(w*.9,h*(.6+jaw*.25));p.lineTo(w*.88,h*(.67+jaw*.35));p.lineTo(w*.64,h*.66);
  });
  teeth(c,[[w*.68,h*.6],[w*.76,h*.58],[w*.84,h*.56],[w*.91,h*.54]],h*.055,1);
  teeth(c,[[w*.72,h*.69],[w*.81,h*.71],[w*.89,h*.72]],h*.05,-1);
  eye(c,w*.69,h*.49,h*.035,1);
}

function drawDiveBat(c, w, h, t) {
  const flap = .5+.5*Math.sin(t*7.5);
  const dive = Math.sin(t*2.2)*h*.035;
  const ink = Math.max(.75,Math.min(w,h)*.055);
  c.save(); c.translate(0,dive);
  c.save(); c.globalAlpha=.34;
  line(c,'#d76cff',Math.max(.5,w*.02),(p)=>{p.moveTo(w*.02,h*.23);p.lineTo(w*.22,h*.38);p.moveTo(w*.08,h*.09);p.lineTo(w*.26,h*.29);});
  c.restore();
  // Jagged wings: the outer tips travel far enough to read as a flap at 24u.
  shape(c,'#56316f','#1c1628',ink,(p)=>{
    p.moveTo(w*.48,h*.48);p.quadraticCurveTo(w*.28,h*(.15+.2*flap),w*.03,h*(.16+.12*flap));
    p.lineTo(w*.12,h*(.49+.17*flap));p.lineTo(w*.23,h*(.4+.2*flap));
    p.lineTo(w*.33,h*(.63+.08*flap));p.lineTo(w*.5,h*.59);
  });
  shape(c,'#56316f','#1c1628',ink,(p)=>{
    p.moveTo(w*.52,h*.48);p.quadraticCurveTo(w*.72,h*(.15+.2*flap),w*.97,h*(.16+.12*flap));
    p.lineTo(w*.88,h*(.49+.17*flap));p.lineTo(w*.77,h*(.4+.2*flap));
    p.lineTo(w*.67,h*(.63+.08*flap));p.lineTo(w*.5,h*.59);
  });
  ellipse(c,w*.5,h*.54,w*.13,h*.23,'#32243f','#1c1628',ink);
  ellipse(c,w*.5,h*.38,w*.12,h*.12,'#74508b','#1c1628',ink);
  triangle(c,w*.4,h*.34,w*.41,h*.12,w*.48,h*.31,'#74508b','#1c1628',ink*.6);
  triangle(c,w*.52,h*.31,w*.59,h*.12,w*.6,h*.34,'#74508b','#1c1628',ink*.6);
  eye(c,w*.46,h*.38,h*.026,-1); eye(c,w*.54,h*.38,h*.026,1);
  shape(c,'#341824','#1c1628',ink*.45,(p)=>{
    p.moveTo(w*.44,h*.45);p.quadraticCurveTo(w*.5,h*.51,w*.56,h*.45);p.lineTo(w*.5,h*.55);
  });
  teeth(c,[[w*.47,h*.47],[w*.53,h*.47]],h*.055,1);
  c.restore();
}

function drawStrikeCobra(c, w, h, t) {
  const wave = Math.sin(t*2.6);
  const strike = Math.max(0,Math.sin(t*1.55));
  const snap = strike*strike*strike;
  const ink = Math.max(.8,Math.min(w,h)*.055);
  shadow(c,w,h,.58);
  // Coiled base: two thick rings give the upright threat enough visual weight.
  ellipse(c,w*.46,h*.82,w*.31,h*.105,'#a46a35','#211722',ink);
  ellipse(c,w*.5,h*.78,w*.2,h*.07,'#d49a42','#211722',ink*.7);
  line(c,'#211722',h*.16,(p)=>{
    p.moveTo(w*.46,h*.78);p.bezierCurveTo(w*(.38+.05*wave),h*.64,w*(.58-.04*wave),h*.5,w*(.52+.18*snap),h*.34);
  });
  line(c,'#b97934',h*.105,(p)=>{
    p.moveTo(w*.46,h*.78);p.bezierCurveTo(w*(.38+.05*wave),h*.64,w*(.58-.04*wave),h*.5,w*(.52+.18*snap),h*.34);
  });
  const hx=w*(.52+.18*snap), hy=h*.32;
  shape(c,'#d0913c','#211722',ink,(p)=>{
    p.moveTo(hx-w*.09,hy+h*.02);p.quadraticCurveTo(hx-w*.24,hy+h*.12,hx-w*.17,hy+h*.3);
    p.lineTo(hx,hy+h*.21);p.lineTo(hx+w*.17,hy+h*.3);
    p.quadraticCurveTo(hx+w*.24,hy+h*.12,hx+w*.09,hy+h*.02);
  });
  ellipse(c,hx,hy,w*.115,h*.09,'#c27d34','#211722',ink*.7);
  eye(c,hx-w*.045,hy-h*.006,h*.027,-1);eye(c,hx+w*.045,hy-h*.006,h*.027,1);
  shape(c,'#351823','#211722',ink*.45,(p)=>{
    p.moveTo(hx-w*.065,hy+h*.045);p.quadraticCurveTo(hx,hy+h*.125,hx+w*.07,hy+h*.04);p.lineTo(hx,hy+h*.14);
  });
  teeth(c,[[hx-w*.035,hy+h*.07],[hx+w*.035,hy+h*.07]],h*.06,1);
  line(c,'#ef445b',Math.max(.45,h*.025),(p)=>{
    p.moveTo(hx,hy+h*.13);p.lineTo(hx+w*.13,hy+h*.18);
    p.moveTo(hx+w*.13,hy+h*.18);p.lineTo(hx+w*.17,hy+h*.15);
    p.moveTo(hx+w*.13,hy+h*.18);p.lineTo(hx+w*.17,hy+h*.21);
  });
}

function drawQuillhog(c, w, h, t) {
  const run=t*10.5;
  const gait=Math.sin(run);
  const flare=.5+.5*Math.sin(t*3.1);
  const ink=Math.max(.8,Math.min(w,h)*.055);
  shadow(c,w,h,.7);speedLines(c,w,h,t*2.8,.4);dust(c,w,h,t*2.5);
  c.save();c.translate(0,-Math.abs(gait)*h*.025);
  // Quills are the whole first read: long, separated and outward-facing.
  const roots=[];
  for(let i=0;i<9;i++){
    const a=-2.72+i*.22;
    roots.push([w*(.5+Math.cos(a)*.22),h*(.58+Math.sin(a)*.18),a]);
  }
  for(let i=0;i<roots.length;i++){
    const [x,y,a]=roots[i];
    const len=w*(.2+.045*flare+(i%2)*.025);
    const tx=x+Math.cos(a)*len,ty=y+Math.sin(a)*len*.82;
    triangle(c,x-w*.025,y+h*.035,x+w*.03,y-h*.025,tx,ty,
      i%2?'#f0c264':'#c75c42','#211722',ink*.55);
  }
  for(const [x,s] of [[.4,gait],[.57,-gait],[.68,gait]]){
    limb(c,[[w*x,h*.7],[w*(x+s*.045),h*.82],[w*(x+s*.075),h*.88]],'#9b603f',h*.065,'#211722');
  }
  ellipse(c,w*.51,h*.59,w*.265,h*.2,'#8b5138','#211722',ink,-.04);
  shape(c,'#aa6843','#211722',ink,(p)=>{
    p.moveTo(w*.62,h*.48);p.quadraticCurveTo(w*.82,h*.48,w*.94,h*.62);
    p.quadraticCurveTo(w*.78,h*.73,w*.61,h*.68);
  });
  ellipse(c,w*.94,h*.61,w*.045,h*.04,'#211722',null,0);
  eye(c,w*.76,h*.54,h*.032,1);
  // Two forward teeth prevent the face becoming a friendly hedgehog.
  teeth(c,[[w*.82,h*.66],[w*.87,h*.65]],h*.05,1);
  c.restore();
}

const DRAW = {
  viciousDog: drawViciousDog,
  dogBulldog: drawBulldog,
  dogDoberman: drawDoberman,
  dogWolfhound: drawWolfhound,
  dogHellhound: drawHellhound,
  dogCyberK9: drawCyberK9,
  chargingBoar: drawChargingBoar,
  sewerCroc: drawSewerCroc,
  diveBat: drawDiveBat,
  strikeCobra: drawStrikeCobra,
  quillhog: drawQuillhog,
};

export const ANIMAL_OBSTACLE_CANDIDATES = [
  { id:'viciousDog', letter:'A', name:'VICIOUS DOG', cabinet:'speed', box:[22,16], elevation:0,
    action:'jump', note:'full-speed head-low charge; teeth, hackles and dust carry the warning' },
  { id:'chargingBoar', letter:'B', name:'CHARGING BOAR', cabinet:'cardboard', box:[23,17], elevation:0,
    action:'jump / smash', note:'heavier ground runner; tusks stay readable before body detail' },
  { id:'sewerCroc', letter:'C', name:'SEWER CROCODILE', cabinet:'plumber', box:[27,11], elevation:0,
    action:'jump', note:'long low snapper; the jaw cycle changes its occupied height' },
  { id:'diveBat', letter:'D', name:'DIVE-BOMBING BAT', cabinet:'crypt', box:[19,14], elevation:9,
    action:'duck / timing', note:'airborne crossing threat; jagged wings and fangs lead the read' },
  { id:'strikeCobra', letter:'E', name:'STRIKING COBRA', cabinet:'neon', box:[15,19], elevation:0,
    action:'timing / jump', note:'coils in place, then extends its hood and fangs into the lane' },
  { id:'quillhog', letter:'F', name:'ATTACK PORCUPINE', cabinet:'frost', box:[22,16], elevation:0,
    action:'jump / timing', note:'running body with a cactus-like fan of quills that flares wider' },
];

export const DOG_OBSTACLE_VARIATIONS = [
  { id:'viciousDog', letter:'A', name:'HACKLE HOUND', note:'current balanced read — low head, open jaw and raised back spikes' },
  { id:'dogBulldog', letter:'B', name:'BULLDOG BRUTE', note:'lowest and widest — square jowls, underbite and spiked collar' },
  { id:'dogDoberman', letter:'C', name:'DOBERMAN SPRINTER', note:'tallest and leanest — spear muzzle, cropped ears and long running legs' },
  { id:'dogWolfhound', letter:'D', name:'SHAGGY WOLFHOUND', note:'ragged natural threat — mane, bushy tail and a long snapping mouth' },
  { id:'dogHellhound', letter:'E', name:'HELLHOUND', note:'crypt-themed option — ember eye, flame ridge and burning tail' },
  { id:'dogCyberK9', letter:'F', name:'CYBER K-9', note:'neon/surge option — plated body, piston legs and a metal tooth jaw' },
];

export function drawAnimalObstacle(ctx, id, w, h, t = 0) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Painters are authored nose-right for simpler coordinates, then mirrored at
  // the public seam so every candidate attacks the right-running hero head-on.
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  draw(ctx, w, h, t);
  ctx.restore();
}
