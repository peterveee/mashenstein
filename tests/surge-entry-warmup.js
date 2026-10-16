import assert from 'node:assert/strict';
import {installDom} from './dom-stub.js';
installDom();
const {AttractState}=await import('../src/game/attract.js');
const {__cryptGouacheTesting:crypt}=await import('../src/engine/stylePacks/cryptGouache.js');
const {save}=await import('../src/engine/save.js');
save.load();
for(const id of ['surge-1','surge-2','surge-3']){
 crypt.reset();assert.equal(crypt.baked,false);
 const state=new AttractState({scenario:{kind:'stage',id},seed:0x5eed,realSettings:save.settings,invulnerable:true,devMode:true,onExit(){}});
 state.enter();
 assert.equal(state.run.introRunning,false,'direct/demo entry skips ordinary warm-up time');
 assert.equal(crypt.baked,true,`${id} must finish Crypt before any gameplay draw`);
 state.exit();
}
console.log('ok: all Surge direct-entry paths prepare Crypt before the first live draw');
