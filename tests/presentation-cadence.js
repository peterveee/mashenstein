import assert from 'node:assert/strict';
let clock=0,pending=null;
globalThis.performance={now:()=>clock};
globalThis.requestAnimationFrame=fn=>{pending=fn;};
const {startLoop}=await import('../src/engine/loop.js');
function measure(hz,seconds=10){
 const frames=[];let ticks=0;const origin=clock;
 const loop=startLoop({update(){ticks++;},draw(){},present(t){frames.push(t);}});
 for(let i=1;i<=hz*seconds;i++){
  clock=origin+i*1000/hz+Math.sin(i*.17)*.35;
  const fn=pending;pending=null;fn(clock);
 }
 loop.stop();
 const gaps=frames.slice(1).map((t,i)=>t-frames[i]);
 return {frames:frames.length,ticks,min:Math.min(...gaps),max:Math.max(...gaps)};
}
for(const hz of [60,120,144,75,240]){
 const r=measure(hz);console.log(hz,r);
 assert(Math.abs(r.ticks-600)<=1,'physics remains 60 Hz');
 assert(Math.abs(r.frames-600)<=2,`presentation stays near 60 FPS at ${hz} Hz`);
 if(hz===120)assert(r.min>15 && r.max<18,'120 Hz must not alternate short 8 ms and long 25 ms presents');
 if(hz===60)assert(r.min>15 && r.max<18,'60 Hz jitter must not drop presents');
}
console.log('ok: smooth high-refresh presentation independent of fixed simulation ticks');

// A late callback must not trigger a burst of overdue presentations. Resume
// discards the hidden interval and starts a fresh presentation deadline.
let frames=[];const l=startLoop({update(){},draw(){},present:t=>frames.push(t)});
function advance(ms){clock+=ms;const cb=pending;pending=null;if(cb)cb(clock);}
for(let i=0;i<120;i++)advance(1000/120);
advance(100);const at=frames.length;advance(1000/120);advance(1000/120);
assert(frames.length-at<=1,'no catch-up presentation burst after a stall');
l.pause();clock+=5000;l.resume();advance(1000/120);
assert.equal(frames.at(-1),clock,'resume presents without an obsolete deadline');
l.stop();
