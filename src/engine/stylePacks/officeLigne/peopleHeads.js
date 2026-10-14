import { line, circ, ell, PAL } from './line.js';
import { head } from './room.js';
const ink=PAL.open.inkM;
function shape(g,pts,fill){g.beginPath();for(const [i,p] of pts.entries()){if(i===0)g.moveTo(...p);else if(p.length===4)g.quadraticCurveTo(...p);else g.lineTo(...p);}g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=ink;g.lineWidth=.075;g.lineJoin='round';g.stroke();}
export function studyHead(g,x,y,r,style,profile=false,skin='#e7b78e',hair='#594337'){
 if(style==='current'){head(g,x,y,r,{skin,hair,style:'short',glasses:false},profile?'right':'front',ink,r*.075);return;}
 g.save();g.translate(x,y);g.scale(r,r);
 // Back hair comes behind the face, not over the eyes.
 if(style==='bouffant')shape(g,[[-1.02,.72],[-1.52,.4,-1.28,-.55],[-1.62,-1.7,-.7,-2.28],[.1,-2.7,1.04,-2.06],[1.7,-1.48,1.25,-.57],[1.48,.3,1.08,.86],[.7,1.12,.5,.85],[-.65,1.04,-1.02,.72]],hair);
 if(style==='eighties')shape(g,[[-1.15,.75],[-1.65,.65,-1.49,.18],[-1.85,-.15,-1.54,-.55],[-1.76,-1.02,-1.3,-1.2],[-1.4,-1.7,-.88,-1.68],[-.65,-2.12,-.22,-1.85],[.16,-2.15,.51,-1.84],[1.02,-2.02,1.2,-1.54],[1.73,-1.5,1.58,-1.03],[1.99,-.7,1.64,-.31],[1.91,.12,1.5,.37],[1.62,.86,1.12,.85],[.65,1.05,-.05,.9],[-.8,1.1,-1.15,.75]],hair);
 if(style==='bob')shape(g,[[-.95,.6],[-1.2,-1.25,0,-1.22],[1.2,-1.2,1.02,.88],[.55,1.15],[-.95,.9]],hair);
 if(style==='bun')ell(g,-.95,.15,.36,.43,hair,ink,.075);
 if(profile){
  shape(g,[[-.85,.55],[-1.15,-.8,-.25,-1],[.8,-1, .93,-.23],[.91,-.02],[1.14,.18],[.91,.29],[.91,.78,.35,.98],[-.45,1.1,-.85,.55]],skin);
  circ(g,.58,-.03,.09,ink);
  line(g,.48,-.25,.72,-.22,ink,.05);
  line(g,.68,.55,.89,.52,ink,.055);
 }else head(g,0,0,1,{skin,hair:skin,style:'short',glasses:false},'front',ink,.075);
 if(style==='part')shape(g,[[-.98,.1],[-1.12,-1.12,-.15,-1.15],[.9,-1.2,1,-.35],[.65,-.38],[.35,-.65,.1,-.77],[-.25,-.18,-.73,-.2],[-.78,.18]],hair);
 if(style==='crop')shape(g,[[-.95,.15],[-1.1,-.9,-.5,-1.02],[-.35,-1.19],[-.15,-1.04],[.12,-1.2],[.32,-1.02],[.65,-1.08],[1,-.7,.94,-.2],[.7,-.32],[.52,-.18],[.3,-.4],[.08,-.23],[-.16,-.4],[-.44,-.25],[-.74,-.38],[-.78,.18]],hair);
 if(style==='bob')shape(g,[[-.96,.4],[-1.1,-1.12,-.12,-1.16],[.92,-1.2,1,-.25],[.6,-.3],[.25,-.5,.05,-.83],[-.25,-.12,-.72,.1],[-.75,.68]],hair);
 if(style==='curls'||style==='eighties')shape(g,[[-.92,.25],[-1.27,.05,-1.1,-.28],[-1.28,-.57,-.94,-.75],[-1.02,-1.05,-.64,-1.08],[-.42,-1.4,-.14,-1.17],[.18,-1.4,.42,-1.15],[.83,-1.25,.91,-.88],[1.25,-.68,1.04,-.36],[.87,-.12,.69,-.36],[.42,-.12,.23,-.35],[-.03,-.13,-.22,-.36],[-.5,-.17,-.68,-.35],[-.68,.25]],hair);
 if(style==='sweep')shape(g,[[-.96,.2],[-1.03,-.7,-.68,-.9],[-.3,-1.5,.46,-1.35],[1.1,-1.3,1.12,-.71],[.68,-.78,.44,-.69],[.05,-.38,-.62,-.33],[-.7,.2]],hair);
 if(style==='bun')shape(g,[[-.98,.25],[-1.15,-1.02,-.15,-1.1],[.88,-1.15,1,-.28],[.72,-.32],[.3,-.45,.05,-.76],[-.27,-.24,-.72,-.15],[-.7,.25]],hair);
 if(style==='bouffant'){
  shape(g,[[-.98,.18],[-1.13,-.9,-.63,-1.33],[.05,-1.92,1.02,-1.11],[1.2,-.66,.92,-.22],[.51,-.3,.25,-.73],[-.15,-.21,-.76,-.18],[-.78,.34]],hair);
  g.beginPath();g.moveTo(-.82,-1.43);g.quadraticCurveTo(-.2,-2.1,.62,-1.78);g.strokeStyle='#f5dfa1';g.lineWidth=.09;g.stroke();
 }
 // A single restrained separation stroke, not a nest of thin strands.
 if(['part','sweep','bun'].includes(style))line(g,-.15,-.96,-.55,-.53,'#b99976',.055);
 if(profile)circ(g,-.48,.2,.22,skin,ink,.06);
 g.restore();
}

// The desk workers face away: silhouette, ears, crown and nape carry the design.
export function studyBackHead(g,x,y,r,style,skin='#e7b78e',hair='#594337'){
 if(style==='current'){head(g,x,y,r,{skin,hair,style:'short',glasses:false},'back',ink,r*.075);return;}
 g.save();g.translate(x,y);g.scale(r,r);
 ell(g,0,.75,.3,.45,skin,ink,.07);
 for(const side of [-1,1])ell(g,side*.94,.2,.19,.29,skin,ink,.065);
 if(style==='bob')shape(g,[[-1,.6],[-1.12,-1.17,0,-1.2],[1.12,-1.17,1,.6],[.96,1.04,.55,.99],[0,.86,-.55,.99],[-.96,1.04,-1,.6]],hair);
 else if(style==='curls')shape(g,[[-.87,.6],[-1.15,.45,-1.03,.15],[-1.23,-.12,-1.04,-.4],[-1.14,-.7,-.85,-.87],[-.72,-1.22,-.4,-1.12],[-.13,-1.34,.12,-1.15],[.45,-1.29,.64,-1.03],[1.01,-1.06,1,-.73],[1.25,-.45,1.04,-.2],[1.2,.14,.97,.35],[1.03,.67,.7,.71],[.4,.94,.13,.79],[-.23,.96,-.45,.77],[-.79,.9,-.87,.6]],hair);
 else {
  const nape=style==='crop'?.48:.72;
  shape(g,[[-.9,.3],[-1.1,-.9,-.15,-1.12],[.94,-1.18,1,-.35],[.94,.37],[.72,.36],[.7,nape],[.35,nape+.13],[-.3,nape+.13],[-.69,nape],[-.72,.36]],hair);
  if(style==='bun')ell(g,.12,.65,.44,.38,hair,ink,.07);
  const shine=hair==='#292730'?'#59515c':'#9e7b5a';
  if(style==='part'){line(g,.25,-.98,.05,-.55,shine,.055);line(g,.05,-.55,-.4,-.26,shine,.055);}
  if(style==='sweep')for(const dx of [-.42,0,.42]){g.beginPath();g.moveTo(dx,-.87);g.quadraticCurveTo(dx+.2,-.24,dx*.6,.45);g.strokeStyle=shine;g.lineWidth=.05;g.stroke();}
  if(style==='crop'){line(g,-.58,.31,-.45,.52,shine,.045);line(g,.58,.31,.45,.52,shine,.045);}
  if(style==='bun'){line(g,-.48,-.65,-.2,.29,shine,.05);line(g,.52,-.65,.3,.29,shine,.05);}
 }
 g.restore();
}

export const OFFICE_WORKER_HAIR = ['part','crop','bob','curls','sweep','bun'];
export function workerHairStyle(seed) {
 const n=Math.sin(seed*12.9898+78.233)*43758.5453;
 return OFFICE_WORKER_HAIR[Math.floor((n-Math.floor(n))*OFFICE_WORKER_HAIR.length)];
}
export function workerHead(g,x,y,r,p,seed,face='back') {
 const style=workerHairStyle(seed);
 if(face==='back'){studyBackHead(g,x,y,r,style,p.skin,p.hair);return;}
 g.save();g.translate(x,y);if(face==='left')g.scale(-1,1);
 studyHead(g,0,0,r,style,true,p.skin,p.hair);
 if(p.glasses){g.strokeStyle=ink;g.lineWidth=r*.065;g.strokeRect(r*.38,-r*.22,r*.45,r*.35);line(g,-r*.3,0,r*.38,-r*.05,ink,r*.04);}
 g.restore();
}
