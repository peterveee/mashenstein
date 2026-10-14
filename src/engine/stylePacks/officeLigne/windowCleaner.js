import { box, rbox, poly, line, circ, ell, PAL } from './line.js';
import { head } from './room.js';
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

function employee(g, kind, t = 0) {
  const hanging = kind === 'hang';
  const effort = hanging ? Math.pow(Math.max(0,Math.sin(t*4.6)),3) : 0;
  const working=kind==='working', stroke=Math.sin(t*2.4);
  const cx = 224 + (hanging ? Math.sin(t*3.7)*4 : working ? stroke*2 : 0);
  const sy = hanging ? 101-effort*4 : working ? 110-Math.max(0,stroke)*1.4 : 110;
  const holdX = kind === 'hang' ? 215 : 210, holdY = kind === 'ties' ? 89 : 85;
  const swipe = kind === 'working' ? Math.sin(t * 2.4) * 6 : 0;
  const cleaner = kind !== 'ties', top = cleaner ? '#83a5ae' : shirt;
  // Trousers and bent legs, with small ordinary office shoes.
  poly(g,[cx-5,sy+13,cx+5,sy+13,cx+5,sy+20,cx-5,sy+20],'#666273',ink,0.5);
  if (kind === 'ties') {
    limb(g,[cx-2.6,sy+18,cx-16,sy+22,cx-11,sy+28],'#666273',4,ink);
    limb(g,[cx+2.6,sy+18,cx-5,sy+25,cx-14,sy+31],'#666273',4,ink);
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
        ax+mx,ay+my,kx+(nx+mx)/2,ky+(ny+my)/2,hx+nx,hy+ny],'#666273',ink,0.5);
      g.save();g.translate(ax,ay);g.rotate(-calf);
      rbox(g,-2,0,5,2.5,0.8,'#4d3d3a',ink,0.4);g.restore();
    }
    // One waist overlaps both thigh roots, without circular hip outlines.
    poly(g,[cx-5,sy+13,cx+5,sy+13,cx+4.5,sy+19,cx,sy+20,cx-4.5,sy+19],'#666273');
  } else {
    poly(g,[cx-5,sy+14,cx+5,sy+14,230,141,226,141,cx,sy+21,222,141,218,141],'#666273',ink,0.5);
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
  rbox(g,cx-5.4,sy,10.8,15.5,1.8,top,ink,0.5);
  box(g,cx-1.4,sy-3,2.8,4,skin,ink,0.35);
  poly(g,[cx-3,sy,cx,sy+2.2,cx-2,sy+4], '#ffffff',ink,0.3);
  poly(g,[cx+3,sy,cx,sy+2.2,cx+2,sy+4], '#ffffff',ink,0.3);
  if (!cleaner) poly(g,[cx,sy+2,cx+1.2,sy+3.5,cx+0.8,sy+10,cx-1,sy+12,cx-1.3,sy+5],'#9d617e',ink,0.3);
  else {
    // Work overalls, with a small squeegee tucked into the belt.
    box(g,cx-3.5,sy+5,7,8,'#526f85',ink,0.35);
    for (const x of [cx-3,cx+3]) line(g,x,sy+1,x,sy+7,'#526f85',1.5);
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
  head(g,cx,sy-6,5,{skin,hair:'#655044',style:'short',glasses:false},'front',ink,0.45);
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
  } else line(g,cx-1.1,sy-3,cx+1.1,sy-3,ink,0.35);
  if (cleaner) {
    rbox(g,cx-5,sy-11,10,2.7,0.8,'#526f85',ink,0.4);
    line(g,cx-1,sy-8.3,cx+6,sy-8.3,'#526f85',1.1);
  }

}

export function paintWindowCleaner(g, kind, t = 0) {
  g.save();g.translate(12,0);
  if (kind === 'working') {
    // Earlier setup: an ordinary cleaner standing on a lower working cradle.
    for (const x of [182,252]) line(g,x,54,x,145,'#66717e',0.65);
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
    // The slack work lanyard follows the body; the hand still owns the pose.
    g.beginPath();g.moveTo(241,85);g.quadraticCurveTo(245,115,229,111);
    g.strokeStyle='#ac9157';g.lineWidth=0.8;g.stroke();
  }
  g.save();
  // Hands stay fixed on the cradle while torso and legs struggle below them.
  employee(g,kind,t);
  g.restore();
  g.restore();
}

