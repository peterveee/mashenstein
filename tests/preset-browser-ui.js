// Opt-in UI regression: run npm run mixer first. Uses an isolated browser and never saves source.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, args:['--mute-audio']});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
const root=fileURLToPath(new URL('../work/mockups/preset-browser/', import.meta.url));
mkdirSync(root, { recursive: true });
try {
 await page.addInitScript(() => localStorage.setItem('mash-mixer-tutorial-seen', '1'));
 await page.goto(process.env.MASH_PRESET_TEST_URL || 'http://127.0.0.1:8010/');
 await page.getByRole('button',{name:'Add track',exact:true}).click();
 const picker=page.locator('#voicepicker');
 await picker.locator('.voicesearch').fill('');
 assert.equal(await picker.locator('.preset-columns h5').count(),4);
 const choose=async (host,key,value)=>host.locator(`[data-facet="${key}"] .preset-options button[data-value="${value}"]`).click();
 await choose(picker,'category','Keys'); await choose(picker,'subcategory','Electric Piano');
 await choose(picker,'engine','RMND-7');
 assert.ok((await picker.locator('.preset-list .vkind').allTextContents()).every(x=>x==='RMND-7'));
 await picker.locator('.voicesearch').fill('guitar');
 assert.equal(await picker.locator('.preset-empty').count(),0);
 for (const key of ['category','subcategory','engine']) {
  assert.equal(await picker.locator(`[data-facet="${key}"] .on`).getAttribute('data-value'),'all');
 }
 assert.equal(await picker.locator('.voicesearch').inputValue(),'guitar');
 await picker.locator('.preset-clear').click();
 await choose(picker,'category','Keys'); await choose(picker,'subcategory','Electric Piano');
 await page.screenshot({path:root+'track-selector-wide.png'});
 // Desktop keyboard navigation does not apply a sound until Enter.
 await picker.locator('[data-facet="engine"] .preset-options button').first().focus();
 await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
 assert.equal(await picker.locator('[data-facet="engine"] .on').getAttribute('data-value'),'MRDR-3');
 await picker.locator('.preset-clear').click(); await picker.locator('.voicesearch').fill('saxophone');
 await picker.locator('[data-voice="mrdrSaxophone"]').click();
 assert.equal(await page.getByRole('button',{name:'Saxophone',exact:true}).count(),2);
 assert.ok(await picker.isVisible(),'Picking a preset keeps the selector open');
 assert.equal(await picker.locator('.voicenow').textContent(),'Show current preset');
 await picker.locator('.preset-clear').click();
 await choose(picker,'category','Winds');
 const alternative=picker.locator('.preset-list button:not([data-voice="mrdrSaxophone"])').first();
 const alternativeId=await alternative.getAttribute('data-voice');
 const alternativeName=await alternative.locator('span').first().textContent();
 await alternative.click();
 assert.ok(await picker.isVisible());
 assert.equal(await picker.locator('.preset-list .on').getAttribute('data-voice'),alternativeId);
 assert.equal(await picker.locator('.preset-list .on span').first().textContent(),alternativeName);
 assert.equal(await picker.locator('[data-facet="category"] .on').getAttribute('data-value'),'Winds');
 await picker.locator('.voiceundo').click();
 assert.ok(await picker.isVisible(),'Undo keeps the selector open');
 assert.equal(await picker.locator('.preset-list .on').getAttribute('data-voice'),'mrdrSaxophone');
 const toolbarBounds=await picker.locator('.voicetoolbar').evaluate(el=>[...el.children].map(e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height})));
 assert.ok(toolbarBounds.every(r=>Math.abs(r.top-toolbarBounds[0].top)<1),'Search and actions share a row');
 // The header is a title bar: dragging its empty space moves the window, and it stays open.
 const dragFrom=await picker.boundingBox();
 const who=await picker.locator('.voicewho').boundingBox();
 await page.mouse.move(who.x+4,who.y+4); await page.mouse.down();
 await page.mouse.move(who.x-116,who.y+64,{steps:6}); await page.mouse.up();
 const dragTo=await picker.boundingBox();
 assert.ok(await picker.isVisible(),'Dragging keeps the selector open');
 assert.ok(Math.abs(dragTo.y-dragFrom.y-60)<2,`Header drag moves the selector (${dragFrom.y} → ${dragTo.y})`);
 await picker.locator('.voiceclose').click();
 assert.equal(await page.getByRole('button',{name:'Saxophone',exact:true}).count(),2);

 const sax=page.getByRole('button',{name:'Saxophone',exact:true}).first();
 await sax.click(); if(!await picker.isVisible())await sax.click();
 assert.equal(await picker.locator('.voicesearch').inputValue(),'');
 assert.equal(await picker.locator('.voicesearch').getAttribute('list'),'preset-recent-searches');
 assert.ok((await picker.locator('#preset-recent-searches option').evaluateAll(options=>options.map(o=>o.value))).includes('saxophone'),'Completed searches remain available on reopening');
 assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('mash-preset-recent-searches')))).includes('saxophone'));
 assert.equal(await picker.locator('.voicetoolbar .preset-clear').count(),1);

 assert.equal(await picker.locator('[data-facet="category"] .on').getAttribute('data-value'),'Winds');
 for(const key of ['subcategory','engine'])assert.equal(await picker.locator(`[data-facet="${key}"] .on`).getAttribute('data-value'),'all');
 assert.ok(new Set(await picker.locator('.preset-list .vkind').allTextContents()).size>1);
 assert.equal(await picker.locator('.preset-list .on').getAttribute('data-voice'),'mrdrSaxophone');
 // Opening on a late-alphabet preset must scroll only its own list, never the facets.
 const geometry=await picker.evaluate(el=>{
   const results=el.querySelector('.voiceresults').getBoundingClientRect();
   return [...el.querySelectorAll('.preset-columns h5')].map(h=>({top:h.getBoundingClientRect().top,bottom:h.getBoundingClientRect().bottom,min:results.top,max:results.bottom}));
 });
 assert.ok(geometry.every(r=>r.top>=r.min && r.bottom<=r.max),'All facet headings stay inside the browser');
 await page.screenshot({path:root+'related-presets-visible-facets.png'});

 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Saxophone',exact:true}).count(),0);
 // Existing drum lanes retain the kit boundary, even when browsing metadata says Effects.
 const kick=page.getByRole('button',{name:'= Arcade Kick',exact:true}).first();
 await kick.click(); if(!await picker.isVisible())await kick.click();
 const cats=await picker.locator('[data-facet="category"] .preset-options').innerText();
 assert.ok(!cats.includes('Guitars')&&!cats.includes('Keys'));
 await picker.locator('.voicesearch').fill('guitar');
 await picker.locator('.voicenow').click();
 assert.equal(await picker.locator('.preset-list .on').getAttribute('data-voice'),'kickEngine');
 // A double click settles on a preset and closes the selector; a single click (above) leaves it open.
 await picker.locator('.preset-clear').click();
 const settle=picker.locator('.preset-list [data-voice]:not([data-voice="kickEngine"])').first();
 const settleId=await settle.getAttribute('data-voice');
 await settle.dblclick();
 assert.ok(!await picker.isVisible(),'Double click closes the selector');
 assert.equal(await page.getByRole('button',{name:'= Arcade Kick',exact:true}).count(),0,`The kick lane is now on ${settleId}`);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await page.keyboard.press('Escape');
 // Library keeps edit/audition behaviour and exposes the engine in both places.
 await page.getByRole('button',{name:'Preset library',exact:true}).click();
 const lib=page.locator('#voicelib');
 await choose(lib,'category','Guitars'); await choose(lib,'subcategory','Acoustic');
 await lib.locator('[data-voice="frppSteelAcoustic"]').click();
 assert.equal(await lib.locator('.preset-current').textContent(),'Steel acoustic · FRPP-6');
 await page.screenshot({path:root+'preset-library-wide.png'});
 // Actual audition call through the existing bench; no preset or song is saved.
 const before=await page.evaluate(()=>{ window.__browseHits=0; const a=window.Audio, f=a.previewNote; a.previewNote=function(...args){window.__browseHits++; return f.apply(this,args);}; return window.__browseHits; });
 await lib.getByRole('button',{name:'Hit',exact:true}).click();
 assert.ok(await page.evaluate(()=>window.__browseHits)>before);
 const hits=await page.evaluate(()=>window.__browseHits);
 await choose(lib,'category','Keys');
 assert.equal(await page.evaluate(()=>window.__browseHits),hits,'Filtering must not audition');
 assert.equal(await lib.locator('.preset-current').textContent(),'Steel acoustic · FRPP-6');
 await lib.locator('.preset-current').click();
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.voice),'frppSteelAcoustic');
 // Save sheet exposes browsing fields without changing the legacy playback category.
 await lib.locator('.vesave').click();
 console.log('Save sheet controls:',await page.locator('.vefield .k').allTextContents());
 assert.ok((await page.locator('.vefield .k').allTextContents()).includes('Subcategory'));
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.setViewportSize({width:1200,height:800});
 const facets=lib.locator('.preset-browser');
 assert.ok(await facets.getByRole('combobox',{name:'Category',exact:true}).isVisible());
 await facets.getByRole('combobox',{name:'Category',exact:true}).click();
 await page.getByRole('option',{name:/^Keys \(/}).click();
 await facets.getByRole('combobox',{name:'Subcategory',exact:true}).click();
 await page.getByRole('option',{name:/^Electric Piano \(/}).click();
 await page.screenshot({path:root+'preset-library-compact.png'});
 await lib.locator('.preset-current').click();
 await lib.locator('.vlclose').click();
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Play (space)',exact:true}).click();
 await page.waitForFunction(()=>window.Audio?.ctx?.state==='running');
 const start=await page.evaluate(()=>window.Audio.ctx.currentTime);
 await page.getByRole('button',{name:'Add track',exact:true}).click();
 const timings=[];
 for(const category of ['Keys','Guitars','Bass','Voices','Drums & Percussion','Keys']) {
   const ms=await picker.locator(`[data-facet="category"] .preset-options button[data-value="${category}"]`).evaluate(b=>{const t=performance.now();b.click();document.querySelector('#voicepicker .preset-list').offsetHeight;return performance.now()-t;});
   timings.push(Math.round(ms));
 }
 assert.ok(await page.evaluate(()=>window.Audio.ctx.currentTime)>start);
 await picker.locator('.voiceclose').click();
 await page.getByRole('button',{name:'Stop, silence all sound, and go back to where playback started',exact:true}).click();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASSED',filterDurationsMs:timings,audioClockAdvanced:true,pageErrors:errors,screenshots:root}));
} finally { await browser.close(); }
