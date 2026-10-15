// Two finite window encounters, attached to the wall rather than the distant city.
import { FACTORS, OFFICE_ZOOM } from '../officeClimb.js';
import { officeArtworks } from './artwork.js';
import { paintWindowCleaner } from './windowCleaner.js';
import { zombieMeetings } from './zombies.js';
const cache = new WeakMap();
export function officeCleanerPlaces(f) {
  const plan=f.founderPlan;
  if(f.floor!=='open'||!plan)return [];
  if(cache.has(plan))return cache.get(plan);
  const def=f.wall.def,end=plan.totalDist*FACTORS.wall*OFFICE_ZOOM;
  const windows=[];
  for(let j=0;j*def.period<end;j++)for(const b of def.bays){
    if(b.type!=='glass')continue;
    const a=b.u+j*def.period,z=b.u1+j*def.period;
    if(z>end||plan.avoid.some(([l,r])=>z>l&&a<r))continue;
    windows.push({a,z});
  }
  const firstLiftEnd=plan.lifts?.length?Math.min(...plan.lifts.map(([,end])=>end)):0;
  // and never in view with EMPLOYEE OF THE MONTH: each gag has the view to itself
  const rate=FACTORS.wall*OFFICE_ZOOM,board=zombieMeetings('open',plan.totalDist).board;
  const clearOfBoard=(x)=>board==null||Math.abs((x-240)/rate-board)>600;
  const working=windows.find(w=>w.a>=firstLiftEnd&&clearOfBoard((w.a+w.z)/2));
  const arts=officeArtworks({...f,coverage:{left:0,right:end},wall:{...f.wall,shift:0}});
  let hanging=null;
  for(const art of arts.filter(a=>a.poster?.label==='HANG IN THERE').sort((a,b)=>a.x-b.x)){
    const win=windows.find(w=>w.a>(working?.a??Infinity)&&((w.z<=art.x&&art.x-w.z<120)||(w.a>=art.x+art.w&&w.a-art.x-art.w<120)));
    const hx=win&&(win.z<=art.x?win.z-64:win.a+64);
    if(win&&clearOfBoard(hx)){hanging={kind:'hang',x:hx,posterX:art.x};break;}
  }
  const out=working?[{kind:'working',x:(working.a+working.z)/2}]:[];
  if(hanging)out.push(hanging);
  cache.set(plan,out);return out;
}
export function paintOfficeCleaners(g,f){
  for(const p of officeCleanerPlaces(f)){
    const x=p.x-f.wall.shift;
    if(x+60<f.coverage.left||x-60>f.coverage.right)continue;
    g.save();g.translate(x-236,0);paintWindowCleaner(g,p.kind,f.t);g.restore();
  }
}
