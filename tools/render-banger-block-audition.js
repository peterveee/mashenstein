// Bounded real-engine check: explicit block FX begins at its range and leaves a tail.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateBanger } from './lib/banger/index.js';
import { sectionEffectPreset, sectionEffectRange } from './lib/banger/section-effects.js';
import { openRenderer, SR } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
const phrase = 'A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5';
const riff = { version:1, source:{id:'block-audition',title:'BLOCK ECHO',from:0,to:1,bpm:120},bars:2,grid:16,stats:{},
  parts:[{key:'lead',label:'Lead',kind:'melodic',role:'hook',meanPitch:72,voice:'synthPluck',voiceParams:null,engineKeys:null,strip:null,bars:[phrase,phrase]}] };
const base = generateBanger({riff,seed:19,options:{style:'trance',form:{template:'club'},sectionFx:{mode:'off'}}});
const f = base.form.find(f=>f.type==='drop');
// A half-section excerpt is long enough for a repeating phrase without rendering a song.
const chain = sectionEffectPreset('pingpong'); chain[0].params.wet=.4;
const after = generateBanger({riff,seed:19,options:{...base.banger.options,sectionFx:{mode:'off',assignments:{[f.id]:[{part:'hook',range:'last2',enabled:true,presetId:'generic:pingpong',chain}]}}}});
assert.deepEqual(base.bank,after.bank); assert.deepEqual(base.mix,after.mix);
const [a,z] = sectionEffectRange(f,'last2');
const begin = a-16, finish = z+16;
const directory = new URL('../work/auditions/banger-section-effects/block/',import.meta.url);
mkdirSync(directory,{recursive:true});
const renderer = await openRenderer();
const audio=[];
try {
  for(const [label,song] of [['before',base],['after',after]]) {
    const out = await renderer.render(song.bank,{mix:song.mix,arrangement:song.arrangement,trackId:null,
      lanes:new Set([song.banger.laneOf.hook]),range:{startStep:begin,endStep:finish},tail:2});
    assert.ok(out.peak>0&&out.peak<1,'non-silent, non-clipping excerpt');
    audio.push(out);
    writeFileSync(new URL(`${label}.wav`,directory),wavBuffer([out.outL,out.outR]));
  }
} finally { await renderer.close(); }
const stepSeconds = 60/base.bank.bpm/4;
const deltaRms = (from,to) => {
  const first = Math.round(from*SR), last = Math.min(audio[0].outL.length,Math.round(to*SR));
  let sum=0; for(let i=first;i<last;i++) sum+=(audio[0].outL[i]-audio[1].outL[i])**2+(audio[0].outR[i]-audio[1].outR[i])**2;
  return Math.sqrt(sum/(2*(last-first)));
};
const startSeconds=(a-begin)*stepSeconds, endSeconds=(z-begin)*stepSeconds;
const probes={ before:deltaRms(0,startSeconds-.03), inside:deltaRms(startSeconds+.05,endSeconds-.1), tail:deltaRms(endSeconds+.05,endSeconds+.5), later:deltaRms(endSeconds+1.4,endSeconds+1.7) };
console.log('Audio probes', { bpm:base.bank.bpm, begin, a,z, startSeconds, endSeconds, ...probes });
assert.ok(probes.before<1e-7,'no effect before its assigned range');
assert.ok(probes.inside>1e-5,'effect changes the assigned range');
assert.ok(probes.tail>1e-7,'echo retains a natural tail after the range');
assert.ok(probes.later<probes.tail,'tail decays after the section');
writeFileSync(new URL('manifest.json',directory),JSON.stringify({sectionId:f.id,range:[a,z],bpm:base.bank.bpm,chain,probes,note:'Bounded real-engine stem check; not listening acceptance.'},null,2)+'\n');
console.log('BLOCK AUDIO: passed',probes);
