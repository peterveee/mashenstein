import { box, rbox, poly, line, circ, ell, PAL } from './line.js';
import { head } from './room.js';
import { studyHead } from './peopleHeads.js';
import { limb, hand } from './barista.js';

const P = PAL.open, ink = P.inkM, skin = '#e7b78e', shirt = '#f2eddc';

function mug(g, x, y) {
  ell(g, x + 2.6, y + 1.7, 1.4, 1.5, null, ink, 0.55);
  rbox(g, x - 2.4, y - 0.6, 4.8, 4.5, 0.7, '#fffaf0', ink, 0.45);
  ell(g, x, y - 0.6, 2.3, 0.65, '#614735', ink, 0.35);
}

function ties(g, x) {
  const colors = ['#af638c', '#7298b4', '#dbb655', '#70a89b'];
  for (let y = 52, i = 0; y < 154; y += 13, i++) {
    poly(g, [x,y,x+1.3,y+3,x+2.8,y+10,x,y+13,x-2.6,y+10,x-1.1,y+3], colors[i%4], ink, 0.45);
    line(g, x-1.5,y+7,x+1.6,y+5,'#f4eadf',0.65);
    poly(g, [x-1.6,y-1,x+1.6,y-1,x+1,y+2,x-0.9,y+2], colors[(i+3)%4], ink,0.4);
  }
}

function pigeon(g,baseX,railY,t,phase){
  const peck=Math.max(0,Math.sin(t*1.8+phase))*.55;
  const flap=Math.max(0,Math.sin(t*5.2+phase))*.7;
  const hop=Math.max(0,Math.sin(t*3.1+phase)) * 2.2;
  const drift=Math.sin(t*1.35+phase)*2.8;
  const dir=Math.cos(t*.55+phase)>0?1:-1;
  const y=railY-2+peck;
  const grey='#8d96a0',dark='#59616d',green='#6e9b88';
  g.save();g.translate(baseX+drift,-hop);g.scale(dir,1);
  // Tail, compact body and two familiar wing bars.
  poly(g,[-2,y-1,-4.5,y-2.4,-3.8,y-.3],dark,ink,.3);
  ell(g,-.2,y,2.7,1.65,grey,ink,.35);
  poly(g,[-1.2,y-.9,.4,y-1.2+flap,1.6,y-.7,.5,y+.1,-1.3,y+.6],dark,ink,.25);
  line(g,-1,y-.35,.6,y-.45+flap,'#c6c9ca',.3);
  line(g,-1.3,y+.15,.45,y+.05+flap,'#c6c9ca',.3);
  ell(g,1.5,y-.7,.75,1.15,green,null);
  circ(g,2.1,y-2,1.35,grey,ink,.3);
  circ(g,2.45,y-2.25,.22,'#20242b');
  poly(g,[3.3,y-2,4.7,y-1.65,3.3,y-1.35],'#d79a49',ink,.2);
  line(g,-.5,y+1,-.8,railY,'#bd7356',.35);
  line(g,1,y+1,1,railY,'#bd7356',.35);
  g.restore();
}
function pigeons(g,railY,t,kind){
  const positions=kind==='hang'?[187,204,228,245]:[192,239];
  positions.forEach((x,i)=>pigeon(g,x,railY,t,i*2.1));
}

function employee(g, kind, t = 0) {
  const hanging = kind === 'hang';
  const effort = hanging ? Math.pow(Math.max(0,Math.sin(t*4.6)),3) : 0;
  const working=kind==='working', stroke=Math.sin(t*2.4);
  const cx = 224 + (hanging ? Math.sin(t*3.7)*4 : working ? stroke*2 : 0);
  const sy = hanging ? 101-effort*4 : working ? 110-Math.max(0,stroke)*1.4 : 110;
  const holdX = kind === 'hang' ? 215 : 210, holdY = kind === 'ties' ? 89 : 85;
  const swipe = kind === 'working' ? Math.sin(t * 2.4) * 6 : 0;
  const cleaner = kind !== 'ties';
  const skin=working?'#bd8964':hanging?'#f0c6a4':'#e7b78e';
  const top=working?'#a8bcb5':hanging?'#d9ae67':shirt;
  const denim=working?'#4c6e86':hanging?'#496b6b':'#666273';
  const hair=working?'#473329':'#a95232';
  // Trousers and bent legs, with small ordinary office shoes.
  poly(g,[cx-5,sy+13,cx+5,sy+13,cx+5,sy+20,cx-5,sy+20],denim,ink,0.5);
  if (kind === 'ties') {
    limb(g,[cx-2.6,sy+18,cx-16,sy+22,cx-11,sy+28],denim,4,ink);
    limb(g,[cx+2.6,sy+18,cx-5,sy+25,cx-14,sy+31],denim,4,ink);
    rbox(g,cx-14,sy+27,6.4,2.7,1,'#4d3d3a',ink,0.4);
    rbox(g,cx-18,sy+30,6.3,2.7,1,'#4d3d3a',ink,0.4);
  } else if (hanging) {
    // Fixed-length thighs and calves: broad alternating kicks, never crossing.
    for (const side of [-1,1]) {
      const phase=t*6.4+(side===1?Math.PI:0);
      const thigh=side*(0.16+0.4*(1+Math.sin(phase)));
      const calf=side*(0.08+0.55*(1+Math.sin(phase+0.7)));
      const hx=cx+side*2.5,hy=sy+17;
      const kx=hx+Math.sin(thigh)*7,ky=hy+Math.cos(thigh)*7;
      const ax=kx+Math.sin(calf)*7,ay=ky+Math.cos(calf)*7;
      const nx=Math.cos(thigh)*1.9,ny=-Math.sin(thigh)*1.9;
      const mx=Math.cos(calf)*1.7,my=-Math.sin(calf)*1.7;
      poly(g,[hx-nx,hy-ny,kx-(nx+mx)/2,ky-(ny+my)/2,ax-mx,ay-my,
        ax+mx,ay+my,kx+(nx+mx)/2,ky+(ny+my)/2,hx+nx,hy+ny],denim,ink,0.5);
      // Toes point away from one another: right shoe outward right, left shoe outward left.
      g.save();g.translate(ax,ay);g.scale(side,1);
      poly(g,[-2,-1.15,1,-1.15,3,.15,2.6,1.2,-2,1.2],'#4d3d3a',ink,0.4);
      line(g,-1.7,.72,2.25,.72,'#a18a78',0.3);
      g.restore();
    }
    // One waist overlaps both thigh roots, without circular hip outlines.
    poly(g,[cx-5,sy+13,cx+5,sy+13,cx+4.5,sy+19,cx,sy+20,cx-4.5,sy+19],denim);
  } else {
    poly(g,[cx-5,sy+14,cx+5,sy+14,230,141,226,141,cx,sy+21,222,141,218,141],denim,ink,0.5);
    for (const x of [-6,2]) rbox(g,224+x,141,5.5,2.5,0.8,'#4d3d3a',ink,0.4);
  }
  // Grip hand is visibly connected to the sleeve and the support.
  if (kind === 'working') {
    limb(g,[cx-4,sy+3,cx-9,sy+9,cx-7,sy+16],top,3.1,ink);
    hand(g,cx-7,sy+16,skin,P);
  } else {
    limb(g,[cx-4,sy+3,cx-10,sy-4,holdX,holdY+2],top,3.1,ink);
    line(g,holdX,holdY+4,holdX,holdY,skin,2.4);
    hand(g,holdX,holdY,skin,P);
  }
  if (cleaner) {
    if (kind === 'working') {
      limb(g,[cx+4,sy+3,cx+10+stroke*2,sy+4+swipe*.35,cx+13+stroke*3,sy-2+swipe],top,3.1,ink);
      hand(g,cx+13+stroke*3,sy-2+swipe,skin,P);
      line(g,cx+13+stroke*3,sy-1+swipe,cx+15+stroke*3,sy-12+swipe,'#b99a67',1.2);
      line(g,cx+10+stroke*3,sy-12+swipe,cx+20+stroke*3,sy-10+swipe,'#586571',1.5);
    } else {
      limb(g,[cx+4,sy+3,cx+10,sy-4,233,holdY+2],top,3.1,ink);
      line(g,233,holdY+4,233,holdY,skin,2.4);
      hand(g,233,holdY,skin,P);
    }

  } else {
    const mx = cx+13, my = sy+8;
    limb(g,[cx+4,sy+3,cx+10,sy+9,mx,my+2],shirt,3,ink);
    hand(g,mx-1,my+2,skin,P); mug(g,mx+1,my);
  }
  // Shirt and collar use the office's thin outlined shapes.
  // A rounded shoulder line and tapered waist join naturally to the sleeves.
  g.beginPath();g.moveTo(cx-3.5,sy);g.quadraticCurveTo(cx-6,sy,cx-5.7,sy+3);
  g.lineTo(cx-4.9,sy+15);g.quadraticCurveTo(cx,sy+16.2,cx+4.9,sy+15);
  g.lineTo(cx+5.7,sy+3);g.quadraticCurveTo(cx+6,sy,cx+3.5,sy);g.closePath();
  g.fillStyle=top;g.fill();g.strokeStyle=ink;g.lineWidth=.45;g.stroke();
  box(g,cx-1.4,sy-3,2.8,4,skin,ink,0.35);
  poly(g,[cx-3,sy,cx,sy+2.2,cx-2,sy+4], '#ffffff',ink,0.3);
  poly(g,[cx+3,sy,cx,sy+2.2,cx+2,sy+4], '#ffffff',ink,0.3);
  if (!cleaner) poly(g,[cx,sy+2,cx+1.2,sy+3.5,cx+0.8,sy+10,cx-1,sy+12,cx-1.3,sy+5],'#9d617e',ink,0.3);
  else {
    // Work overalls, with a small squeegee tucked into the belt.
    rbox(g,cx-3.5,sy+5,7,9,0.7,denim,ink,0.35);
    for (const x of [cx-3,cx+3]) line(g,x,sy+1,x,sy+7,denim,1.5);
    for(const x of [cx-3,cx+3])circ(g,x,sy+6,.45,'#e0c079');
    rbox(g,cx-1.7,sy+8,3.4,2.7,.4,null,'#b5c2bd',.3);
    line(g,cx+6,sy+12,cx+7,sy+21,'#b99a67',1.1);
    line(g,cx+3.7,sy+11,cx+8.7,sy+11.6,'#586571',1.3);
  }
  line(g,cx-5,sy+14,cx+5,sy+14,'#514637',1);
  box(g,cx+2.7,sy+5,2.1,2.8,'#fffdf2',ink,0.25);
  // Cover the rounded stroke ends where sleeves enter the shirt.
  // Keep just the outside silhouette: no circular shoulder sockets.
  for (const side of [-1,1]) {
    poly(g,[cx+side*2,sy+0.5,cx+side*5,sy+0.5,cx+side*5.6,sy+4.7,cx+side*2,sy+5.5],top);
  }
  if(cleaner)studyHead(g,cx,sy-6,working?5.3:5,working?'part':'curls',false,skin,hair);
  else head(g,cx,sy-6,5,{skin,hair:'#655044',style:'short',glasses:false},'front',ink,0.45);
  // Small flat eyelids and a resigned mouth, in the NPC's own face scale.
  line(g,cx-2.5,sy-6.1,cx-0.8,sy-6.1,ink,0.35);
  line(g,cx+0.8,sy-6.1,cx+2.5,sy-6.1,ink,0.35);
  line(g,cx-1.2,sy-3.3,cx+1.2,sy-3.3,ink,0.4);
  // Replace the stock smile, rather than drawing an expression over it.
  ell(g,cx,sy-3.05,2.05,1.05,skin);
  if (kind === 'hang') {
    ell(g,cx-1.8,sy-6,0.95,1.15,'#fffaf0',ink,0.25);
    ell(g,cx+1.8,sy-6,0.95,1.15,'#fffaf0',ink,0.25);
    circ(g,cx-1.7,sy-6.4,0.42,ink);circ(g,cx+1.7,sy-6.4,0.42,ink);
    line(g,cx-2.8,sy-7.5,cx-0.8,sy-8.2,ink,0.45);
    line(g,cx+0.8,sy-8.2,cx+2.8,sy-7.5,ink,0.45);
    ell(g,cx,sy-2.9,1.35,0.95+effort*0.3,'#68403d',ink,0.35);
    line(g,cx-0.8,sy-3.35,cx+0.8,sy-3.35,'#fffaf0',0.5);
    // A small sweat bead makes the alarm readable at gameplay scale.
    const drop=(t*0.85)%1;
    ell(g,cx+5.9,sy-7+drop*5,0.55,0.9,'#bde9ef',ink,0.2);
  } else {
    line(g,cx-1.1,sy-3,cx+1.1,sy-3,ink,0.35);
    if(working){
      // Calm older cleaner: a moustache and a soft navy work cap.
      ell(g,cx-.85,sy-3.8,1.05,.48,hair);ell(g,cx+.85,sy-3.8,1.05,.48,hair);
      g.beginPath();g.moveTo(cx-5.1,sy-9);g.quadraticCurveTo(cx-5.4,sy-13.2,cx-.2,sy-13.2);
      g.quadraticCurveTo(cx+4.8,sy-13.2,cx+5.1,sy-9);g.closePath();
      g.fillStyle='#426077';g.fill();g.strokeStyle=ink;g.lineWidth=.4;g.stroke();
      line(g,cx-4.8,sy-9,cx+6,sy-8.5,'#314858',1.1);
      line(g,cx-.1,sy-12.7,cx-.1,sy-9.6,'#849ca9',.25);
    }
  }

}

export function paintWindowCleaner(g, kind, t = 0) {
  g.save();g.translate(12,0);
  if (kind === 'working') {
    // Earlier setup: an ordinary cleaner standing on a lower working cradle.
    for (const x of [182,252]) line(g,x,54,x,145,'#66717e',0.65);
    pigeons(g,124,t,kind);
    employee(g,kind,t);
    box(g,176,144,82,5,'#c9ced8',ink,0.5);
    box(g,176,124,82,1.5,'#c9ced8',ink,0.45);
    for (const x of [182,209,252]) line(g,x,125,x,144,ink,0.5);
    poly(g,[242,137,249,137,248,144,243,144],'#d9a441',ink,0.4);
    g.restore();return;
  }
  if (kind === 'ties') ties(g,210);
  else {
    // Empty cleaner's cradle; its cables continue to the floor above.
    for (const x of [182,252]) line(g,x,54,x,81,'#66717e',0.65);
    box(g,176,71,82,1.5,'#c9ced8',ink,0.45);
    for (const x of [182,209,235,252]) line(g,x,72,x,81,ink,0.5);
    box(g,176,80,82,5,'#c9ced8',ink,0.5);
    box(g,177,83,80,1.4,'#8e95a4');
    poly(g,[242,75,249,75,248,80,243,80],'#d9a441',ink,0.4);
  }
  pigeons(g,71,t,kind);
  g.save();
  // Hands stay fixed on the cradle while torso and legs struggle below them.
  employee(g,kind,t);
  g.restore();
  g.restore();
}

