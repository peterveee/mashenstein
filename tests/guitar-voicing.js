import assert from 'node:assert/strict';
import { guitarVoicing } from '../src/engine/guitar-voicing.js';
import { createNoteFxProcessor, hasEnabledNoteFx, resolveNoteFx } from '../src/engine/note-fx.js';
const hz = n => 440 * 2 ** ((n - 69) / 12);
const midi = ns => ns.map(f => Math.round(69 + 12 * Math.log2(f / 440)));
const config = { enabled: true, style: 'auto', position: 0 };
const c = [60,64,67].map(hz);
assert.deepEqual(midi(guitarVoicing(c, config)), [48,52,55,60,64]);
assert.deepEqual(midi(guitarVoicing([64,67,72].map(hz), config)), [48,52,55,60,64]);
const unchanged = [[60,67], [60,61,62,63,64,65,66]];
for (const ns of unchanged) {
  const source = ns.map(hz);
  assert.equal(guitarVoicing(source, config), source, `leave ${ns} alone`);
}
// Ambiguous/unknown sets are placed by pitch class, without interpreting a root.
const pitchClasses = notes => [...new Set(midi(notes).map(n => n % 12))].sort((a,b)=>a-b);
for (const ns of [[60,61,67], [60,62,67], [60,63,66,69], [60,64,67,69]]) {
  const source = ns.map(hz);
  const result = guitarVoicing(source, config);
  assert.notEqual(result, source, `fit ambiguous/unusual ${ns}`);
  assert.deepEqual(pitchClasses(result), pitchClasses(source));
  assert.equal(result.length, new Set(ns.map(n=>n%12)).size);
  assert.deepEqual(guitarVoicing(source,config),result, 'repeatable fallback');
}
const ambiguous = [72,74,79].map(hz);
const low = guitarVoicing(ambiguous,{...config,style:'barre',position:2});
const high = guitarVoicing(ambiguous,{...config,style:'barre',position:10});
assert.notDeepEqual(midi(low),midi(high));
assert.deepEqual(pitchClasses(low),pitchClasses(high));
assert.equal(guitarVoicing(c, {}), c);
assert.equal(guitarVoicing([hz(60.1),hz(64),hz(67)], config)[0], hz(60.1));
const pcs = ns => [...new Set(ns.map(n => n % 12))].sort((a,b) => a-b);
for (let root=0;root<12;root++) for (const intervals of [[0,4,7],[0,3,7],[0,4,7,10],[0,4,7,11]]) {
  for (const style of ['auto','open','barre']) for (const position of [0,5,12]) {
    const notes = intervals.map(n => hz(60+root+n));
    const result = guitarVoicing(notes, {...config,style,position});
    assert.deepEqual(pcs(midi(result)), pcs(midi(notes)));
    if (result !== notes) {
      assert.ok(result.length <= 6 && result.length >= 3);
      assert.ok(midi(result).every(n => n >= 40 && n <= 78));
    }
  }
}
assert.notDeepEqual(midi(guitarVoicing(c,{...config,style:'barre',position:3})),
  midi(guitarVoicing(c,{...config,style:'barre',position:8})));
assert.ok(hasEnabledNoteFx({guitar:config}));
assert.equal(resolveNoteFx({guitar:config},{noteFx:{chords:{mode:'on',guitar:{position:5}}}},'chords').guitar.enabled,true);
const p = createNoteFxProcessor();
const input = {laneKey:'chords',value:c,len:2,step:0,barIndex:0,spb:0.1,
  config:{guitar:config,strum:{enabled:true,direction:'down',gapMs:20}}};
const events=p.process(input);
assert.deepEqual(midi(events.map(e=>e.freq)),[64,60,55,52,48]);
assert.deepEqual(events.map(e=>e.delay),[0,0.02,0.04,0.06,0.08]);
assert.ok(events.every(e=>e.len===2));
assert.equal(p.process({...input,len:[2,3,4]}).length,3);
assert.equal(p.process({...input,len:[2,2,2]}).length,5);
assert.deepEqual(midi(p.process({...input,config:{guitar:config}}).map(e=>e.freq)),[48,52,55,60,64]);
assert.equal(p.process({...input,config:{guitar:config,arp:{enabled:true,rate:1}}})[0].freq,hz(48));
console.log('GUITAR VOICING: PASSED');

// Rendering bakes guitar notes and gates into the arrangement, leaving Strum editable.
const { draftOf, renderArpToNotes, readBarLane } = await import('../tools/lib/arrangement-edit.js');
const bank = { bpm: 120, chords: [c, ...Array(15).fill(null), c, ...Array(15).fill(null)],
  chordsLen: [2, ...Array(15).fill(null), 2, ...Array(15).fill(null)] };
const draft = draftOf(bank);
const fx = { guitar: config, strum: {enabled:true,direction:'down',gapMs:18} };
const baked = renderArpToNotes(bank,draft,0,0,'chords',fx);
assert.deepEqual(midi(readBarLane(bank,baked,0,'chords')[0]),[48,52,55,60,64]);
assert.deepEqual(midi(readBarLane(bank,baked,1,'chords')[0]),[60,64,67]);
assert.equal(resolveNoteFx(fx,baked.plan[0],'chords').guitar.enabled,false);
assert.equal(resolveNoteFx(fx,baked.plan[0],'chords').strum.enabled,true);
assert.equal(resolveNoteFx(fx,baked.plan[1],'chords').guitar.enabled,true);
assert.deepEqual(bank.chords[0],c);
const all = renderArpToNotes(bank,draft,0,1,'chords',fx,{trackGuitarCleared:true});
assert.ok(all.plan.every(bar=>!bar.noteFx));
assert.deepEqual(midi(readBarLane(bank,all,1,'chords')[0]),[48,52,55,60,64]);
console.log('GUITAR RENDER TO NOTES: PASSED');

const ambiguousBank = { bpm:120, chords:[ambiguous,...Array(15).fill(null)] };
const ambiguousRender = renderArpToNotes(ambiguousBank,draftOf(ambiguousBank),0,0,'chords',
  {guitar:config},{trackGuitarCleared:true});
assert.deepEqual(readBarLane(ambiguousBank,ambiguousRender,0,'chords')[0],guitarVoicing(ambiguous,config));
console.log('AMBIGUOUS GUITAR VOICING: PASSED');
