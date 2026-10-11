// Reproducible real-run review of the shipped office, including phone-shaped
// frames, crane/pull-back, pit and all three stage identities. Requires npm run dev.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out='work/mockups/office-ligne89/production';
mkdirSync(out,{recursive:true});mkdirSync('work/video/office-ligne89',{recursive:true});
const browser=await chromium.launch();const report=[];
try {
 for(const orientation of ['landscape','portrait'])for(const stage of [1,2,3]){
  const viewport=orientation==='portrait'?{width:393,height:852}:{width:852,height:393};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,recordVideo:{dir:'work/video/office-ligne89',size:viewport}});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:8001/?mute&goto=stage&cab=office&stage=office-${stage}&invuln`,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__mash_booted&&['RunState','BriefingState'].includes(window.__mash_state));
  if(await page.evaluate(()=>window.__mash_state==='BriefingState'))await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__mash_state==='RunState');
  await page.waitForTimeout(2500);
  await page.evaluate(()=>{
   const r=window.__mash_cur;window.__officeTiming={bg:[],post:[]};
   for(const hook of ['bg','post']){const old=r.style[hook];r.style[hook]=function(...args){const t=performance.now();const result=old.apply(this,args);window.__officeTiming[hook].push(performance.now()-t);return result;};}
  });
  await page.waitForTimeout(1500);
  const facts=await page.evaluate(()=>{const r=window.__mash_cur;return {style:r.style.name,stage:r.stage.index,lightBg:r.style.lightBg,zoom:r.camZoom,pan:r.camPan,floorY:r.camFloorY,timing:window.__officeTiming,obstacles:r.obstacles.map(o=>({type:o.type,x:o.x,w:o.w})),frame:{w:document.querySelector('#game').width,h:document.querySelector('#game').height}};});
  await page.locator('#game').screenshot({path:`${out}/office-${stage}-${orientation}-run.png`});
  await page.evaluate(()=>{const r=window.__mash_cur;r.update=()=>{};r.camPan=r.prevCamPan=38;r.camZoom=r.prevCamZoom=1.3;r.camFloorY=r.prevCamFloorY=232;r.prevCamX=r.camX;r.prevBackgroundT=r.backgroundT;r.prevTRun=r.tRun;});
  await page.waitForTimeout(120);
  await page.locator('#game').screenshot({path:`${out}/office-${stage}-${orientation}-crane.png`});
  if(stage<3){await page.evaluate(()=>{const r=window.__mash_cur;const pit=r.pitPlan[0];if(pit){r.camX=r.prevCamX=pit.x-110;const gap=r.obstacles.find(o=>o.def?.isGap);if(gap){gap.x=pit.x;gap.w=pit.w;}else{r.obstacles.push({type:'gap',x:pit.x,w:pit.w,h:0,live:true,def:{isGap:true}});}r.camPan=r.prevCamPan=0;r.camZoom=r.prevCamZoom=2.2;}});await page.waitForTimeout(120);await page.locator('#game').screenshot({path:`${out}/office-${stage}-${orientation}-pit.png`});}
  const video=page.video();await context.close();await video.saveAs(`work/video/office-ligne89/office-${stage}-${orientation}.webm`);
  const summarise=values=>({samples:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,max:Math.max(...values)});
  report.push({stage,orientation,errors,...facts,timing:{bg:summarise(facts.timing.bg),post:summarise(facts.timing.post)}});
  console.log(`office-${stage} ${orientation}: ${facts.style}, zoom ${facts.zoom}, errors ${errors.length}`);
 }
}finally{await browser.close();}
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
if(report.some(r=>r.errors.length))process.exitCode=1;
