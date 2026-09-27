// Exercise the actual spawn bank: future shared patterns must not reintroduce
// out-of-place obstacles; selected costumes must remain stable after movement.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { Spawner } = await import('../src/game/spawner.js');
const { Rng } = await import('../src/engine/rng.js');
const { cryptZombieRole } = await import('../src/sprites/crypt-enemies.js');
const cab=CABINET_BY_ID.crypt;
const banned=new Set(['cactus','cactusBig','drone','buzzbird']);
for(const p of cab.patterns)for(const c of p.cells)assert(!banned.has(c.t),c.t);
for(const tunnel of cab.tunnels)for(const type of tunnel.hazards)assert(!banned.has(type),type);
const roles=new Set();let count=0;
for(let stage=1;stage<=3;stage++)for(let seed=1;seed<=12;seed++){
 const sp=new Spawner({cabinet:cab,rng:new Rng(seed),tierMax:Math.min(2,stage)});
 const obstacles=[],pickups=[];sp.nextX=300;
 for(let x=0;x<18000;x+=240)sp.fill(x,240,obstacles,pickups,()=>45,18000);
 for(const ob of obstacles){
  count++;assert(!banned.has(ob.type),`stage ${stage}, seed ${seed}: ${ob.type}`);
  if(ob.type==='zombie'){
   const role=cryptZombieRole(ob.bobPhase);roles.add(role);
   const restored=structuredClone(ob);restored.x-=333;
   assert.equal(cryptZombieRole(restored.bobPhase),role);
   assert.deepEqual([ob.w,ob.h],[10,14]);
  }
 }
}
assert.equal(roles.size,3,'all three costumes appear in actual spawns');
// Other cabinets retain their own hazards.
assert(CABINET_BY_ID.speed.patterns.some(p=>p.cells.some(c=>c.t.startsWith('cactus'))));
assert(CABINET_BY_ID.neon.patterns.some(p=>p.cells.some(c=>c.t==='drone')));
console.log(`CRYPT LANE CAST: passed (${count} obstacles, 36 runs, all 3 costumes)`);
