// Actual finite-stage office destinations, with the normal gameplay cameras.
import { chromium } from 'playwright';
import { mkdirSync,writeFileSync } from 'node:fs';
import { OFFICE_ITINERARIES, officeLandmarks } from '../src/engine/stylePacks/officeLigne/progression.js';
const out='work/mockups/office-ligne89/progression';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const report=[];
const stageFilter=Number(process.argv.find(a=>a.startsWith('--stage='))?.split('=')[1]);
try{
 for(const portrait of [false,true])for(const stage of [1,2,3]){
  if(stageFilter&&stage!==stageFilter)continue;
  const page=await browser.newPage({viewport:portrait?{width:393,height:852}:{width:852,height:393}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:8001/?mute&goto=stage&cab=office&stage=office-${stage}&invuln`);
  await page.waitForFunction(()=>window.__mash_state==='RunState');await page.waitForTimeout(3000);
  await page.evaluate(()=>{window.__mash_cur.update=()=>{};});
  const floor=['lobby','open','exec'][stage-1];
  const distance=await page.evaluate(()=>window.__mash_cur.totalDist);
  const rate=officeLandmarks(floor,0,distance)[0].rate;
  for(const [label,progress] of OFFICE_ITINERARIES[floor]){
   const facts=await page.evaluate(({progress,portrait,rate})=>{
    const r=window.__mash_cur;
    // Centre the selected room in landscape; use the normal phone zoom in portrait.
    const offset=portrait?r.portraitWorldXOffset()*r.camZoom:0;
    const centre=(240-offset)/(r.camZoom/2);
    const cam=r.totalDist*progress+(112-centre)/rate;
    r.camX=r.prevCamX=cam;r.distance=cam;r.prevTRun=r.tRun;
    r.camPan=r.prevCamPan=0;r.camFloorY=r.prevCamFloorY=232;
    r.prevBackgroundT=r.backgroundT;
    return {totalDist:r.totalDist,cam,zoom:r.camZoom};
   },{progress,portrait,rate});
   await page.waitForTimeout(180);
   await page.locator('#game').screenshot({path:`${out}/office-${stage}-${portrait?'portrait':'landscape'}-${label}.png`});
   report.push({stage,portrait,label,...facts,errors:[...errors]});
  }
  await page.close();console.log(`office-${stage} ${portrait?'portrait':'landscape'}: ${errors.length} errors`);
 }
}finally{await browser.close();}
writeFileSync(`${out}/report${stageFilter?`-${stageFilter}`:''}.json`,JSON.stringify(report,null,2)+'\n');
if(report.some(r=>r.errors.length))process.exitCode=1;
