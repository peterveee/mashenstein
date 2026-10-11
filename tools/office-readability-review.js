// Real-run hazard/coin contrast at four phases of the office wall period.
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
const out='work/mockups/office-ligne89/readability';mkdirSync(out,{recursive:true});
const bundle=await build({stdin:{contents:"import { makeObstacle, makePickup } from './src/game/entities.js'; window.__officeMake = { makeObstacle, makePickup };",resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
const groups=[['chair','printer','paperwork'],['fireBarrel','boomBarrier','bananaPeel'],['dogSnarler','catFury','crate'],['cactus','drone','buzzbird']];
const phases=[0,1000,2000,2999];const report=[];const browser=await chromium.launch();
try{for(const orientation of['landscape','portrait'])for(const stage of[1,2,3]){
 const page=await browser.newPage({viewport:orientation==='portrait'?{width:393,height:852}:{width:852,height:393}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://localhost:8001/?mute&goto=stage&cab=office&stage=office-${stage}&invuln`);
 await page.waitForFunction(()=>window.__mash_state==='RunState');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForTimeout(2000);
 await page.evaluate(()=>{const r=window.__mash_cur;r.update=()=>{};r.introRunning=false;r.introFreeze=0;r.zoneCard=false;r.camPan=r.prevCamPan=0;r.camZoom=r.prevCamZoom=r.zoomNormal||2.2;r.camFloorY=r.prevCamFloorY=232;r.prevBackgroundT=r.backgroundT;r.prevTRun=r.tRun;});
 for(let group=0;group<groups.length;group++){
  await page.evaluate(({types,cam})=>{const r=window.__mash_cur;r.camX=r.prevCamX=cam;r.obstacles=types.map((type,i)=>window.__officeMake.makeObstacle(type,cam+85+i*30));r.pickups=[window.__officeMake.makePickup('coin',cam+77,12)];},{types:groups[group],cam:phases[group]});
  await page.waitForTimeout(150);
  await page.locator('#game').screenshot({path:`${out}/office-${stage}-${orientation}-group-${group+1}.png`});
 }
 report.push({stage,orientation,errors});console.log(`${stage} ${orientation}: ${errors.length} errors`);await page.close();
}}finally{await browser.close();}writeFileSync(`${out}/report.json`,JSON.stringify({groups,phases,runs:report},null,2)+'\n');if(report.some(r=>r.errors.length))process.exitCode=1;
