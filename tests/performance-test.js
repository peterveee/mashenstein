import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const {performancePlan, PerformanceTestState, PERFORMANCE_STAGES}=await import('../src/game/performance-test.js');
const {STAGE_BY_ID}=await import('../src/data/stages.js');
const {Dev}=await import('../src/dev/index.js');
const {beginPerformanceCapture,performanceCaptureActive}=await import('../src/engine/performance-capture.js');
for(const full of [false,true]){
 const p=performancePlan(full),n=p.length/2;
 assert.equal(n,full?PERFORMANCE_STAGES.length:4);
 for(let i=0;i<n;i++){assert.ok(STAGE_BY_ID[p[i].id]);assert.equal(p[i].seed,p[i+n].seed);assert.equal(p[i].id,p[i+n].id);}
}
const s=new PerformanceTestState({onExit(){}});
s.running=true;s.report={results:[]};s.previousDev={enabled:true,timeScale:1};s.showReport=()=>{};
Dev.enabled=false;beginPerformanceCapture();s.finish('stopped');
assert.equal(performanceCaptureActive(),false);assert.equal(Dev.enabled,true);assert.equal(s.report.status,'stopped');
s.finish('ignored');assert.equal(s.report.status,'stopped');
console.log('ok: repeatable valid stages, cancellation restores tools and disarms capture');
const {startCrumbSession,suspendCrumbPersistence,crumb}=await import('../src/engine/diag.js');
let writes=0;const set=localStorage.setItem.bind(localStorage);
localStorage.setItem=(...a)=>{writes++;return set(...a);};
startCrumbSession('performance-test');const before=writes;
suspendCrumbPersistence(true);for(let i=0;i<10;i++)crumb('run',i);
assert.equal(writes,before,'no breadcrumb storage while testing');
suspendCrumbPersistence(false);crumb('after test');assert.equal(writes,before+1,'normal crash persistence resumes');
console.log('ok: benchmark suspends and restores diagnostic writes');
