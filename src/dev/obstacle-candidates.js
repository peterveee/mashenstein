// Gallery-only obstacle concepts. These are vector studies, not registered
// gameplay entities: the gallery renders each one both at honest lane size and
// as a large detail study before any collision or spawning contract is chosen.

const TAU = Math.PI * 2;

// Hazard language shared by the concept sheet. The first pass made several
// candidates look like attractive set dressing; this pass gives every one a
// readable "do not touch" signal without turning them into identical props.
// The mark is deliberately strongest at the provisional lane size, where a
// player has only a fraction of a second to classify the silhouette.
const SIGNAL_KIND = {
  pipePiston: 'impact', steamValve: 'impact', manhole: 'impact',
  roadBarrier: 'block', rollingTyre: 'rolling', fallingSign: 'overhead',
  laserGate: 'beam', pulseMine: 'impact', shieldDrone: 'beam',
  crackingIce: 'impact', snowball: 'rolling', iceGeyser: 'impact',
  coffin: 'overhead', ghostHand: 'impact', boneWheel: 'rolling',
  beatGate: 'beam', bassTile: 'impact', sustainBeam: 'beam',
  foldingWall: 'block', tapeSpool: 'rolling', puppetHand: 'overhead',
  filingDrawer: 'block', shredder: 'impact', turnstile: 'block',
  glitchCrate: 'impact', mashGate: 'beam', ruleSwitcher: 'block',
};

function dangerSignal(c, id, w, h, t, foreground = false) {
  const kind = SIGNAL_KIND[id] || 'block';
  const pulse = 0.55 + 0.45 * Math.sin(t * 7.5);
  const hot = '#ff5748';
  const amber = '#f6d33c';
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (!foreground) {
    // The first pass used a red bounding frame. It read as a selection box,
    // not as an object that could hurt you. Replace it with a broken, spiky
    // threat silhouette behind the prop — the same outward-facing language
    // that makes a cactus dangerous at a glance.
    const cx = w * 0.5, cy = h * 0.57;
    const count = kind === 'beam' ? 6 : 8;
    c.globalAlpha = 0.28 + 0.12 * pulse;
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count + (kind === 'rolling' ? 0.18 : 0);
      const innerX = cx + Math.cos(a) * w * 0.2;
      const innerY = cy + Math.sin(a) * h * 0.2;
      const outerX = cx + Math.cos(a) * w * (kind === 'beam' ? 0.44 : 0.39);
      const outerY = cy + Math.sin(a) * h * (kind === 'beam' ? 0.44 : 0.39);
      const sideX = Math.sin(a) * w * 0.055;
      const sideY = -Math.cos(a) * h * 0.055;
      path(c, i % 2 ? '#a82d35' : '#61202c', '#26131d', Math.max(0.45, w * 0.018), (p) => {
        p.moveTo(innerX + sideX, innerY + sideY);
        p.lineTo(outerX, outerY);
        p.lineTo(innerX - sideX, innerY - sideY);
        p.closePath();
      });
    }
  }

  if (kind === 'rolling') {
    // Speed bars behind a rolling threat make its motion and direction obvious
    // even on a still frame strip.
    c.globalAlpha = foreground ? 0.7 : 0.4;
    for (let i = 0; i < 3; i++) line(c, i === 1 ? amber : hot, Math.max(0.7, w * 0.035), (p) => {
      const y = h * (0.32 + i * 0.15);
      p.moveTo(w * (0.03 + i * 0.025), y);
      p.lineTo(w * (0.21 + i * 0.025), y);
    });
    if (foreground) {
      chevron(c, w * 0.73, h * 0.14, w * 0.13, h * 0.1, hot, Math.max(0.8, w * 0.035));
    }
  } else if (kind === 'overhead') {
    // Downward arrows say "this space is about to become occupied" rather
    // than leaving a hanging prop looking like harmless scenery.
    c.globalAlpha = foreground ? 0.9 : 0.42;
    for (let i = 0; i < 2; i++) {
      const x = w * (0.28 + i * 0.34);
      line(c, i ? amber : hot, Math.max(0.8, w * 0.04), (p) => {
        p.moveTo(x, h * 0.04); p.lineTo(x, h * 0.16);
        p.moveTo(x - w * 0.06, h * 0.1); p.lineTo(x, h * 0.18); p.lineTo(x + w * 0.06, h * 0.1);
      });
    }
  } else if (kind === 'beam') {
    // Brackets and a hot central tick frame a beam/corridor hazard as a closed
    // opening. They sit outside the painter's main silhouette, so they remain
    // legible when the beam itself is thin or animation happens to be dark.
    c.globalAlpha = foreground ? 0.85 : 0.4;
    for (const x of [w * 0.1, w * 0.9]) {
      line(c, hot, Math.max(0.8, w * 0.035), (p) => {
        p.moveTo(x, h * 0.27); p.lineTo(x + (x < w * .5 ? w * .06 : -w * .06), h * .27);
        p.moveTo(x, h * 0.73); p.lineTo(x + (x < w * .5 ? w * .06 : -w * .06), h * .73);
      });
    }
  } else {
    // Ground and block hazards get contact teeth. These are deliberately not
    // literal spikes on every object: they are short red impact ticks that
    // communicate the dangerous edge without changing the proposed silhouette.
    c.globalAlpha = foreground ? 0.9 : 0.46;
    const count = w < 24 ? 3 : 7;
    for (let i = 0; i < count; i++) {
      const x = w * (0.18 + i * (0.64 / Math.max(1, count - 1)));
      path(c, i % 2 ? amber : hot, null, 0, (p) => {
        p.moveTo(x - w * 0.035, h * 0.91);
        p.lineTo(x, h * 0.79 - h * 0.03 * pulse);
        p.lineTo(x + w * 0.035, h * 0.91); p.closePath();
      });
    }
  }
  if (foreground) {
    // A small warning triangle remains as a secondary read, but it no longer
    // carries the burden of making the prop feel dangerous.
    warning(c, w * 0.88, h * 0.1, Math.max(1.15, w * 0.065), pulse > 0.55);
  }
  c.restore();
}

function path(c, fill, stroke, line, fn) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
}

function rr(c, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  c.moveTo(x + q, y);
  c.lineTo(x + w - q, y); c.quadraticCurveTo(x + w, y, x + w, y + q);
  c.lineTo(x + w, y + h - q); c.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  c.lineTo(x + q, y + h); c.quadraticCurveTo(x, y + h, x, y + h - q);
  c.lineTo(x, y + q); c.quadraticCurveTo(x, y, x + q, y); c.closePath();
}

function box(c, x, y, w, h, r, fill, ink = '#171522', line = 1.5) {
  path(c, fill, ink, line, (p) => rr(p, x, y, w, h, r));
}

function line(c, color, width, fn) {
  path(c, null, color, width, fn);
}

function dot(c, x, y, r, fill, ink = null, width = 1) {
  path(c, fill, ink, width, (p) => p.arc(x, y, r, 0, TAU));
}

function bolt(c, x, y, r = 1.3) {
  dot(c, x, y, r, '#dbe5ef', '#242836', 0.65);
  line(c, '#77808e', 0.55, (p) => { p.moveTo(x - r * 0.55, y); p.lineTo(x + r * 0.55, y); });
}

function chevron(c, x, y, w, h, color, width = 2) {
  line(c, color, width, (p) => {
    p.moveTo(x, y); p.lineTo(x + w, y + h / 2); p.lineTo(x, y + h);
  });
}

function warning(c, x, y, r, lit = true) {
  path(c, lit ? '#f6d33c' : '#726a48', '#171522', 1, (p) => {
    p.moveTo(x, y - r); p.lineTo(x + r, y + r * 0.75); p.lineTo(x - r, y + r * 0.75); p.closePath();
  });
  line(c, '#171522', Math.max(0.8, r * 0.16), (p) => {
    p.moveTo(x, y - r * 0.35); p.lineTo(x, y + r * 0.28);
  });
  dot(c, x, y + r * 0.5, Math.max(0.5, r * 0.08), '#171522');
}

function shadow(c, w, h, alpha = 0.22) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = '#070912';
  c.beginPath(); c.ellipse(w * 0.5, h * 0.94, w * 0.38, h * 0.055, 0, 0, TAU); c.fill(); c.restore();
}

function drawPipePiston(c, w, h, t) {
  const lift = 0.5 + 0.5 * Math.sin(t * 2.4);
  shadow(c, w, h);
  box(c, w * .18, h * .65, w * .64, h * .25, w * .05, '#148c52');
  box(c, w * .28, h * (.3 - .12 * lift), w * .44, h * (.4 + .12 * lift), w * .06, '#28b86a');
  box(c, w * .12, h * (.22 - .12 * lift), w * .76, h * .14, w * .04, '#3bd37d');
  box(c, w * .2, h * .69, w * .6, h * .07, w * .015, '#a82d35', '#26131d', w * .018);
  for (let i = 0; i < 5; i++) path(c, i % 2 ? '#f6d33c' : '#ff5748', null, 0, (p) => {
    const x = w * (.25 + i * .125);
    p.moveTo(x - w * .035, h * .76); p.lineTo(x, h * (.86 + .015 * Math.sin(t * 4 + i))); p.lineTo(x + w * .035, h * .76); p.closePath();
  });
  line(c, '#a8f0c8', w * .035, (p) => { p.moveTo(w*.2, h*(.27-.12*lift)); p.lineTo(w*.8, h*(.27-.12*lift)); });
  bolt(c, w*.22, h*.73); bolt(c, w*.78, h*.73);
}

function drawSteamValve(c, w, h, t) {
  shadow(c, w, h);
  box(c, w*.24, h*.58, w*.52, h*.3, w*.06, '#9b3943');
  box(c, w*.39, h*.42, w*.22, h*.2, w*.035, '#d4b05a');
  dot(c, w*.5, h*.38, w*.2, '#e85a42', '#301821', w*.035);
  dot(c, w*.5, h*.38, w*.055, '#f0d8a0', '#301821', w*.025);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + t * .35;
    line(c, '#f06454', w*.07, (p) => { p.moveTo(w*.5, h*.38); p.lineTo(w*.5+Math.cos(a)*w*.2, h*.38+Math.sin(a)*w*.2); });
  }
  for (let i = 0; i < 3; i++) {
    const rise = (t*.28 + i/3) % 1;
    c.save(); c.globalAlpha = 1-rise;
    dot(c, w*(.38+i*.12), h*(.5-rise*.55), w*(.06+.04*rise), '#e7fbff', '#80b7c2', w*.015);
    c.restore();
  }
}

function drawManhole(c, w, h, t) {
  const open = .5 + .5 * Math.sin(t * 1.7);
  shadow(c, w, h, .35);
  path(c, '#10141c', null, 0, (p) => p.ellipse(w*.5, h*.78, w*.34, h*.1, 0, 0, TAU));
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    path(c, i % 2 ? '#ff5748' : '#a82d35', '#26131d', w * .012, (p) => {
      p.moveTo(w*.5 + Math.cos(a-.12)*w*.23, h*.78 + Math.sin(a-.12)*h*.07);
      p.lineTo(w*.5 + Math.cos(a)*w*.38, h*.78 + Math.sin(a)*h*.115);
      p.lineTo(w*.5 + Math.cos(a+.12)*w*.23, h*.78 + Math.sin(a+.12)*h*.07); p.closePath();
    });
  }
  c.save(); c.translate(0, -open*h*.32);
  path(c, '#566576', '#171522', w*.035, (p) => p.ellipse(w*.5, h*.74, w*.36, h*.1, 0, 0, TAU));
  for (let i=-2;i<=2;i++) line(c, '#8997a5', w*.018, (p) => { p.moveTo(w*(.3+i*.065),h*.72); p.lineTo(w*(.38+i*.065),h*.78); });
  c.restore();
  warning(c, w*.5, h*.34, w*.11, open > .45);
}

function drawBarrier(c, w, h, t) {
  shadow(c,w,h);
  const tilt = -.12 + .1*Math.sin(t*1.6);
  box(c,w*.16,h*.55,w*.18,h*.34,w*.035,'#30394a');
  c.save(); c.translate(w*.27,h*.58); c.rotate(tilt);
  box(c,0,-h*.09,w*.62,h*.16,h*.025,'#f3eee1');
  for(let i=0;i<4;i++) path(c,'#e85032',null,0,(p)=>{const x=w*(.05+i*.15);p.moveTo(x,-h*.08);p.lineTo(x+w*.09,-h*.08);p.lineTo(x+w*.04,h*.06);p.lineTo(x-w*.05,h*.06);p.closePath();});
  c.restore();
  dot(c,w*.25,h*.49,w*.045,(Math.floor(t*4)%2)?'#ff493d':'#631d25','#171522',w*.018);
}

function drawTyre(c,w,h,t){
  shadow(c,w,h);
  c.save();c.translate(w*.5,h*.6);c.rotate(-t*2.6);
  dot(c,0,0,w*.31,'#171a22','#090a0e',w*.05); dot(c,0,0,w*.16,'#6c7280','#090a0e',w*.03); dot(c,0,0,w*.055,'#171a22');
  for(let i=0;i<10;i++){const a=i*TAU/10;line(c,'#5b616d',w*.025,(p)=>{p.moveTo(Math.cos(a)*w*.24,Math.sin(a)*w*.24);p.lineTo(Math.cos(a)*w*.3,Math.sin(a)*w*.3);});}
  c.restore();
}

function drawRoadSign(c,w,h,t){
  const lean=.08*Math.sin(t*1.4);
  shadow(c,w,h); c.save();c.translate(w*.5,h*.88);c.rotate(lean);
  box(c,-w*.035,-h*.55,w*.07,h*.55,w*.02,'#c7ccd2');
  path(c,'#f6d33c','#171522',w*.035,(p)=>{p.moveTo(0,-h*.78);p.lineTo(w*.25,-h*.58);p.lineTo(0,-h*.38);p.lineTo(-w*.25,-h*.58);p.closePath();});
  chevron(c,-w*.1,-h*.66,w*.13,h*.16,'#171522',w*.04); chevron(c,w*.02,-h*.66,w*.13,h*.16,'#171522',w*.04);
  c.restore();
}

function drawLaserGate(c,w,h,t){
  shadow(c,w,h); const high=(Math.floor(t*.75)%2)===0; const y=high?h*.34:h*.67;
  for(const x of [w*.13,w*.81]){box(c,x,h*.18,w*.08,h*.7,w*.025,'#252d4b');dot(c,x+w*.04,y,w*.045,'#ff4bd8','#130d26',w*.018);}
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.55+.35*Math.sin(t*8);line(c,'#ff42e2',w*.055,(p)=>{p.moveTo(w*.21,y);p.lineTo(w*.81,y);});line(c,'#9ffcff',w*.018,(p)=>{p.moveTo(w*.21,y);p.lineTo(w*.81,y);});c.restore();
}

function drawPulseMine(c,w,h,t){
  const pulse=.5+.5*Math.sin(t*4.5);shadow(c,w,h);
  dot(c,w*.5,h*.66,w*.25,'#252948','#101020',w*.04);dot(c,w*.5,h*.66,w*(.09+.025*pulse),'#ff4bd8','#9ffcff',w*.025);
  for(let i=0;i<8;i++){const a=i*TAU/8;line(c,i%2?'#7356ce':'#42dbed',w*.045,(p)=>{p.moveTo(w*.5+Math.cos(a)*w*.22,h*.66+Math.sin(a)*w*.22);p.lineTo(w*.5+Math.cos(a)*w*.34,h*.66+Math.sin(a)*w*.34);});}
  c.save();c.globalAlpha=.4*(1-pulse);dot(c,w*.5,h*.66,w*(.3+.18*pulse),null,'#ff4bd8',w*.025);c.restore();
}

function drawShieldDrone(c,w,h,t){
  const bob=Math.sin(t*2.8)*h*.04;c.save();c.translate(0,bob);
  c.save();c.globalAlpha=.18;dot(c,w*.5,h*.48,w*.42,'#62ecff','#62ecff',w*.02);c.restore();
  box(c,w*.27,h*.37,w*.46,h*.22,w*.09,'#5340a7');dot(c,w*.5,h*.48,w*.09,'#ff5ddb','#161229',w*.025);
  for (const side of [-1, 1]) path(c, '#ff5748', '#161229', w*.018, (p) => {
    p.moveTo(w*.5 + side*w*.18, h*.42); p.lineTo(w*.5 + side*w*.37, h*.35); p.lineTo(w*.5 + side*w*.2, h*.52); p.closePath();
  });
  for(let i=0;i<3;i++){const x=w*(.3+i*.2);line(c,'#9ffcff',w*.025,(p)=>{p.moveTo(x,h*.34);p.lineTo(x-w*.08,h*.25);});}
  c.restore();
}

function drawCrackingIce(c,w,h,t){
  shadow(c,w,h,.12);path(c,'#aee8f8','#496f91',w*.025,(p)=>{p.moveTo(w*.08,h*.72);p.lineTo(w*.93,h*.69);p.lineTo(w*.84,h*.9);p.lineTo(w*.15,h*.91);p.closePath();});
  const phase=Math.floor(t*2)%3; line(c,'#31678b',w*.025,(p)=>{p.moveTo(w*.5,h*.7);p.lineTo(w*.43,h*.79);p.lineTo(w*.55,h*.83);p.lineTo(w*.46,h*.9);if(phase>0){p.moveTo(w*.43,h*.79);p.lineTo(w*.28,h*.75);p.moveTo(w*.55,h*.83);p.lineTo(w*.72,h*.76);}if(phase>1){p.moveTo(w*.46,h*.9);p.lineTo(w*.34,h*.84);p.moveTo(w*.72,h*.76);p.lineTo(w*.86,h*.83);}});
}

function drawSnowball(c,w,h,t){
  shadow(c,w,h);c.save();c.translate(w*.5,h*.62);c.rotate(-t*1.8);
  dot(c,0,0,w*.32,'#eaf7ff','#6185a3',w*.035);line(c,'#b4d7ea',w*.025,(p)=>{p.arc(0,0,w*.19,-.4,4.2);p.arc(w*.05,-w*.02,w*.09,2.2,5.4);});dot(c,-w*.11,-w*.1,w*.035,'#fff');c.restore();
}

function drawIceGeyser(c,w,h,t){
  const rise=.45+.45*Math.sin(t*2.7);shadow(c,w,h,.15);
  path(c,'#78cfea','#315f87',w*.03,(p)=>{p.moveTo(w*.18,h*.88);p.lineTo(w*.34,h*(.7-.3*rise));p.lineTo(w*.43,h*(.78-.5*rise));p.lineTo(w*.52,h*(.55-.42*rise));p.lineTo(w*.62,h*(.77-.36*rise));p.lineTo(w*.8,h*.88);p.closePath();});
  for(let i=0;i<4;i++)dot(c,w*(.3+i*.14),h*(.74-rise*(.2+i%2*.12)),w*.035,'#effcff','#85c9e3',w*.012);
}

function drawCoffin(c,w,h,t){
  const open=.08+.42*(.5+.5*Math.sin(t*1.8));shadow(c,w,h);
  path(c,'#6a3e55','#1b1320',w*.04,(p)=>{p.moveTo(w*.33,h*.17);p.lineTo(w*.67,h*.17);p.lineTo(w*.78,h*.4);p.lineTo(w*.68,h*.89);p.lineTo(w*.32,h*.89);p.lineTo(w*.22,h*.4);p.closePath();});
  c.save();c.translate(w*.26,h*.5);c.rotate(-open);path(c,'#8a5064','#1b1320',w*.035,(p)=>{p.moveTo(0,-h*.34);p.lineTo(w*.34,-h*.34);p.lineTo(w*.45,-h*.12);p.lineTo(w*.36,h*.36);p.lineTo(0,h*.36);p.lineTo(-w*.09,-h*.12);p.closePath();});line(c,'#d5a45d',w*.04,(p)=>{p.moveTo(w*.12,-h*.18);p.lineTo(w*.12,h*.12);p.moveTo(w*.03,-h*.04);p.lineTo(w*.21,-h*.04);});c.restore();
  if(open>.3){dot(c,w*.52,h*.46,w*.035,'#90ffb5');dot(c,w*.62,h*.46,w*.035,'#90ffb5');}
}

function drawGhostHand(c,w,h,t){
  const rise=.5+.5*Math.sin(t*2.1);shadow(c,w,h,.35);
  c.save();c.globalAlpha=.82;path(c,'#88e0c0','#17252b',w*.03,(p)=>{p.moveTo(w*.35,h*.9);p.lineTo(w*.34,h*(.64-.28*rise));p.lineTo(w*.27,h*(.45-.18*rise));p.quadraticCurveTo(w*.23,h*(.35-.18*rise),w*.31,h*(.35-.16*rise));p.lineTo(w*.42,h*(.53-.22*rise));p.lineTo(w*.44,h*(.28-.14*rise));p.quadraticCurveTo(w*.46,h*(.2-.13*rise),w*.52,h*(.28-.13*rise));p.lineTo(w*.55,h*(.51-.2*rise));p.lineTo(w*.64,h*(.34-.14*rise));p.quadraticCurveTo(w*.69,h*(.27-.12*rise),w*.72,h*(.37-.12*rise));p.lineTo(w*.65,h*(.63-.25*rise));p.lineTo(w*.68,h*.9);p.closePath();});c.restore();
}

function drawBoneWheel(c,w,h,t){
  shadow(c,w,h);c.save();c.translate(w*.5,h*.62);c.rotate(-t*2.2);
  dot(c,0,0,w*.29,'#e9dcc0','#291f28',w*.04);dot(c,0,0,w*.16,'#332936','#291f28',w*.03);
  for(let i=0;i<8;i++){const a=i*TAU/8;line(c,'#e9dcc0',w*.07,(p)=>{p.moveTo(Math.cos(a)*w*.15,Math.sin(a)*w*.15);p.lineTo(Math.cos(a)*w*.31,Math.sin(a)*w*.31);});dot(c,Math.cos(a)*w*.31,Math.sin(a)*w*.31,w*.045,'#e9dcc0','#291f28',w*.015);}c.restore();
}

function drawBeatGate(c,w,h,t){
  const beat=(t*2)%1,open=beat<.34;shadow(c,w,h);
  for(const x of [w*.14,w*.78])box(c,x,h*.18,w*.08,h*.7,w*.02,'#36372d');
  const y=open?h*.23:h*.58;line(c,'#d9e65a',w*.075,(p)=>{p.moveTo(w*.22,y);p.lineTo(w*.78,y);});
  for (let i = 0; i < 5; i++) path(c, i % 2 ? '#f6d33c' : '#ff5748', '#292a22', w*.012, (p) => {
    const x = w * (.3 + i * .1); p.moveTo(x-w*.035,y); p.lineTo(x,y+h*.1); p.lineTo(x+w*.035,y); p.closePath();
  });
  for(let i=0;i<4;i++)dot(c,w*(.3+i*.13),h*.15,w*.025,i===Math.floor(t*2)%4?'#f6d33c':'#6b7040');
}

function drawBassTile(c,w,h,t){
  const beat=Math.max(0,Math.sin(t*Math.PI*4));shadow(c,w,h,.15);
  box(c,w*.08,h*(.74-.12*beat),w*.84,h*.15,w*.03,'#4c5137');
  for(let i=0;i<5;i++)box(c,w*(.14+i*.15),h*(.77-.12*beat),w*.1,h*.05,w*.01,i%2?'#d9e65a':'#aab344','#292a22',w*.012);
  c.save();c.globalAlpha=.25*beat;line(c,'#f6ef82',w*.04,(p)=>{p.moveTo(w*.12,h*(.68-.14*beat));p.lineTo(w*.88,h*(.68-.14*beat));});c.restore();
}

function drawSustainBeam(c,w,h,t){
  const held=(t%2.4)<1.55;shadow(c,w,h);
  box(c,w*.1,h*.3,w*.14,h*.58,w*.03,'#34372d');box(c,w*.76,h*.3,w*.14,h*.58,w*.03,'#34372d');
  if(held){c.save();c.globalAlpha=.5+.2*Math.sin(t*7);box(c,w*.24,h*.42,w*.52,h*.12,w*.02,'#dce95c','#697033',w*.015);c.restore();}
  line(c,'#f6d33c',w*.025,(p)=>{p.moveTo(w*.16,h*.25);p.quadraticCurveTo(w*.28,h*.08,w*.38,h*.25);p.lineTo(w*.48,h*.25);});
}

function drawFoldingWall(c,w,h,t){
  const fold=.3+.7*(.5+.5*Math.sin(t*1.3));shadow(c,w,h);
  const left=w*.18,right=w*(.18+.64*fold);path(c,'#c99d64','#3b2b24',w*.035,(p)=>{p.moveTo(left,h*.88);p.lineTo(left,h*.24);p.lineTo(right,h*(.36-.12*fold));p.lineTo(right,h*.88);p.closePath();});
  for(let i=1;i<4;i++){const x=left+(right-left)*i/4;line(c,i%2?'#8d6847':'#e4c696',w*.018,(p)=>{p.moveTo(x,h*(.25+.03*i));p.lineTo(x,h*.88);});}
  for (let i = 0; i < 5; i++) path(c, i % 2 ? '#ff5748' : '#a82d35', '#3b2b24', w*.012, (p) => {
    const x = left + (right-left) * (i+.5)/5; p.moveTo(x-w*.04,h*.28); p.lineTo(x,h*.13); p.lineTo(x+w*.04,h*.28); p.closePath();
  });
  box(c,w*.38,h*.48,w*.16,h*.12,w*.02,'#f7eee0','#3b2b24',w*.02);dot(c,w*.43,h*.54,w*.015,'#202028');dot(c,w*.5,h*.54,w*.015,'#202028');
}

function drawTapeSpool(c,w,h,t){
  shadow(c,w,h);c.save();c.translate(w*.48,h*.62);c.rotate(-t*1.9);dot(c,0,0,w*.29,'#e5c35b','#352b24',w*.04);dot(c,0,0,w*.14,'#b18b38','#352b24',w*.025);for(let i=0;i<6;i++){const a=i*TAU/6;dot(c,Math.cos(a)*w*.2,Math.sin(a)*w*.2,w*.035,'#fff0a5','#806624',w*.012);}c.restore();
  path(c,'rgba(246,211,60,.5)','#8b7330',w*.015,(p)=>{p.moveTo(w*.65,h*.72);p.quadraticCurveTo(w*.82,h*.78,w*.94,h*.88);p.lineTo(w*.9,h*.93);p.quadraticCurveTo(w*.78,h*.84,w*.61,h*.78);p.closePath();});
}

function drawPuppetHand(c,w,h,t){
  const press=.5+.5*Math.sin(t*1.7);shadow(c,w,h,.32);
  line(c,'#463222',w*.03,(p)=>{p.moveTo(w*.24,0);p.lineTo(w*.31,h*(.42+.22*press));p.moveTo(w*.76,0);p.lineTo(w*.68,h*(.42+.22*press));});
  path(c,'#e8c89d','#3b2b24',w*.035,(p)=>{p.moveTo(w*.27,h*(.35+.22*press));p.quadraticCurveTo(w*.37,h*(.26+.22*press),w*.45,h*(.42+.22*press));p.lineTo(w*.48,h*(.22+.22*press));p.quadraticCurveTo(w*.51,h*(.14+.22*press),w*.56,h*(.24+.22*press));p.lineTo(w*.58,h*(.43+.22*press));p.quadraticCurveTo(w*.69,h*(.28+.22*press),w*.74,h*(.4+.22*press));p.lineTo(w*.68,h*(.67+.22*press));p.quadraticCurveTo(w*.48,h*(.78+.18*press),w*.3,h*(.65+.22*press));p.closePath();});
  box(c,w*.38,h*(.61+.2*press),w*.25,h*.13,w*.025,'#b8874e','#3b2b24',w*.025);
}

function drawFilingDrawer(c,w,h,t){
  const open=.2+.8*(.5+.5*Math.sin(t*1.5));shadow(c,w,h);
  box(c,w*.18,h*.18,w*.52,h*.7,w*.035,'#82909c');
  box(c,w*.17,h*.2,w*.045,h*.66,w*.012,'#a82d35','#2a252e',w*.012);
  for(let i=0;i<3;i++){const y=h*(.25+i*.2);box(c,w*.22,y,w*.44,h*.16,w*.018,'#aeb9c1');box(c,w*.38,y+h*.04,w*.13,h*.035,w*.01,'#515b65','#303842',w*.012);}
  box(c,w*.22,h*.45,w*(.44+.22*open),h*.16,w*.018,'#d1d8dc');
  for(let i=0;i<3;i++)path(c,i%2?'#fff':'#e6edf1','#77818a',w*.01,(p)=>{const x=w*(.48+i*.08+.2*open);p.moveTo(x,h*.46);p.lineTo(x+w*.09,h*.46);p.lineTo(x+w*.07,h*.38);p.lineTo(x-w*.01,h*.38);p.closePath();});
}

function drawShredder(c,w,h,t){
  shadow(c,w,h);box(c,w*.13,h*.47,w*.74,h*.4,w*.04,'#737e89');box(c,w*.18,h*.42,w*.64,h*.14,w*.025,'#202832');
  for(let i=0;i<7;i++){const x=w*(.24+i*.085);chevron(c,x,h*.5,w*.035,h*.12,i%2?'#c6d0d8':'#929ea8',w*.028);}
  const feed=(t*.25)%1;path(c,'#fff','#68727c',w*.012,(p)=>{p.moveTo(w*.35,h*(.08+.32*feed));p.lineTo(w*.67,h*(.12+.32*feed));p.lineTo(w*.63,h*(.47+.13*feed));p.lineTo(w*.38,h*(.45+.13*feed));p.closePath();});
  dot(c,w*.75,h*.72,w*.035,'#57e0a8','#26342e',w*.012);
}

function drawTurnstile(c,w,h,t){
  shadow(c,w,h);box(c,w*.44,h*.25,w*.12,h*.64,w*.035,'#687681');dot(c,w*.5,h*.39,w*.09,'#3c4852','#202832',w*.025);
  c.save();c.translate(w*.5,h*.39);c.rotate(t*1.2);for(let i=0;i<3;i++){const a=i*TAU/3;line(c,'#d8e0e5',w*.06,(p)=>{p.moveTo(0,0);p.lineTo(Math.cos(a)*w*.38,Math.sin(a)*w*.38);});path(c,'#ff5748','#202832',w*.018,(p)=>{p.moveTo(Math.cos(a)*w*.34,Math.sin(a)*w*.34);p.lineTo(Math.cos(a)*w*.47,Math.sin(a)*w*.47);p.lineTo(Math.cos(a+.14)*w*.34,Math.sin(a+.14)*w*.34);p.closePath();});}c.restore();
}

function drawGlitchCrate(c,w,h,t){
  shadow(c,w,h);const glitch=Math.floor(t*8)%5===0;
  c.save();if(glitch)c.translate(w*.06,0);box(c,w*.2,h*.28,w*.6,h*.6,w*.035,'#9d6c3e');line(c,'#e1b36a',w*.035,(p)=>{p.moveTo(w*.23,h*.31);p.lineTo(w*.77,h*.85);p.moveTo(w*.77,h*.31);p.lineTo(w*.23,h*.85);});warning(c,w*.5,h*.57,w*.14,true);c.restore();
  if(glitch){c.save();c.globalAlpha=.75;for(let i=0;i<5;i++)c.fillStyle=i%2?'#ff49dc':'#52eafa',c.fillRect(w*(.08+i*.15),h*(.2+i*.12),w*.2,h*.035);c.restore();}
}

function drawMashGate(c,w,h,t){
  shadow(c,w,h);const phase=Math.floor(t*1.3)%3;const cols=[['#49e5f2','#ff4bd8'],['#b8e8fa','#4c87ae'],['#e6c068','#9a7042']][phase];
  for(const x of [w*.13,w*.79])box(c,x,h*.12,w*.09,h*.76,w*.025,cols[0]);
  line(c,cols[1],w*.055,(p)=>{p.moveTo(w*.22,h*(phase===1?.62:.38));p.lineTo(w*.79,h*(phase===1?.62:.38));});
  for(let i=0;i<3;i++){const x=w*(.34+i*.15);dot(c,x,h*.18,w*.035,i===phase?'#fff':'#3a3b48','#171522',w*.012);}
}

function drawRuleSwitcher(c,w,h,t){
  shadow(c,w,h);box(c,w*.2,h*.22,w*.6,h*.66,w*.05,'#7d303c');box(c,w*.27,h*.3,w*.46,h*.24,w*.025,'#111522');
  const state=Math.floor(t*.8)%3;const icon=['JUMP','DUCK','GO'][state];c.fillStyle=['#f6d33c','#52eafa','#74e58b'][state];c.font=`700 ${Math.max(5,w*.13)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(icon,w*.5,h*.42);
  const angle=[-.65,.65,0][state];line(c,'#dce4ec',w*.055,(p)=>{p.moveTo(w*.5,h*.69);p.lineTo(w*.5+Math.sin(angle)*w*.19,h*.69-Math.cos(angle)*h*.16);});dot(c,w*.5,h*.69,w*.065,'#e24f5d','#171522',w*.022);
}

const DRAW = {
  pipePiston: drawPipePiston, steamValve: drawSteamValve, manhole: drawManhole,
  roadBarrier: drawBarrier, rollingTyre: drawTyre, fallingSign: drawRoadSign,
  laserGate: drawLaserGate, pulseMine: drawPulseMine, shieldDrone: drawShieldDrone,
  crackingIce: drawCrackingIce, snowball: drawSnowball, iceGeyser: drawIceGeyser,
  coffin: drawCoffin, ghostHand: drawGhostHand, boneWheel: drawBoneWheel,
  beatGate: drawBeatGate, bassTile: drawBassTile, sustainBeam: drawSustainBeam,
  foldingWall: drawFoldingWall, tapeSpool: drawTapeSpool, puppetHand: drawPuppetHand,
  filingDrawer: drawFilingDrawer, shredder: drawShredder, turnstile: drawTurnstile,
  glitchCrate: drawGlitchCrate, mashGate: drawMashGate, ruleSwitcher: drawRuleSwitcher,
};

export const OBSTACLE_CANDIDATES = [
  ['plumber','pipePiston','A','PIPE PISTON','rises after a mechanical wind-up','jump'],
  ['plumber','steamValve','B','STEAM VALVE','timed vertical steam burst','timing'],
  ['plumber','manhole','C','LOOSE MANHOLE','lifts into a temporary barrier','jump'],
  ['speed','roadBarrier','A','ROAD BARRIER','alternates high and low','jump / duck'],
  ['speed','rollingTyre','B','ROLLING TYRE','fast readable rolling hazard','jump / smash'],
  ['speed','fallingSign','C','FALLING SIGN','shadow telegraph, then drop','timing'],
  ['neon','laserGate','A','LASER GATE','high-low beam cycle','jump / duck'],
  ['neon','pulseMine','B','PULSE MINE','charge ring warns before pulse','timing'],
  ['neon','shieldDrone','C','SHIELD DRONE','protects a nearby target','shoot'],
  ['frost','crackingIce','A','CRACKING ICE','three visible failure stages','move'],
  ['frost','snowball','B','ROLLING SNOWBALL','large approaching ground threat','jump / smash'],
  ['frost','iceGeyser','C','ICE GEYSER','snow puffs, then upward burst','timing'],
  ['crypt','coffin','A','SNAPPING COFFIN','lid opens into the lane','timing'],
  ['crypt','ghostHand','B','GHOST HAND','floor shadow, then upward grab','jump'],
  ['crypt','boneWheel','C','BONE WHEEL','rolling breakable hazard','jump / smash'],
  ['rhythm','beatGate','A','BEAT GATE','opens on the strong beat','timing'],
  ['rhythm','bassTile','B','BASS PULSE TILE','floor rises on the kick','jump'],
  ['rhythm','sustainBeam','C','SUSTAIN BEAM','holds for the note duration','timing'],
  ['cardboard','foldingWall','A','FOLDING WALL','flat scenery folds upright','jump'],
  ['cardboard','tapeSpool','B','TAPE SPOOL','rolls and leaves sticky tape','jump / smash'],
  ['cardboard','puppetHand','C','VISIBLE HAND','lowers a prop into the lane','timing'],
  ['office','filingDrawer','A','FILING DRAWER','slides horizontally into the lane','jump'],
  ['office','shredder','B','PAPER SHREDDER','pulls loose paper toward its mouth','jump'],
  ['office','turnstile','C','SECURITY TURNSTILE','rotating three-arm gate','timing'],
  ['surge','glitchCrate','A','GLITCH CRATE','familiar object breaks visual rules','jump / smash'],
  ['surge','mashGate','B','MASH GATE','changes cabinet identity and height','jump / duck'],
  ['surge','ruleSwitcher','C','RULE SWITCHER','announces the next action rule','read / react'],
].map(([cabinet,id,letter,name,note,action])=>({cabinet,id,letter,name,note,action}));

export function drawObstacleCandidate(ctx, id, w, h, t = 0) {
  const draw = DRAW[id];
  if (!draw) return;
  ctx.save();
  dangerSignal(ctx, id, w, h, t, false);
  draw(ctx, w, h, t);
  dangerSignal(ctx, id, w, h, t, true);
  ctx.restore();
}
