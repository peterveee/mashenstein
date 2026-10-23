// Opt-in UI regression: run npm run mixer first. Uses an isolated browser and never saves source.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../work/mockups/preset-browser/', import.meta.url));
mkdirSync(root, { recursive: true });
const browser=await chromium.launch({headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.addInitScript(()=>localStorage.setItem('mash-mixer-tutorial-seen','1'));
 await page.goto(process.env.MASH_PRESET_TEST_URL || 'http://127.0.0.1:8010/');
 await page.getByRole('button',{name:'Preset library',exact:true}).click();
 const lib=page.locator('#voicelib');
 await lib.locator('.voicesearch').fill('Studio Grand');
 await lib.locator('[data-voice="mrdrGrand"]').click();
 await lib.getByRole('button',{name:/^Advanced$/i}).click();
 const advanced=page.locator('#synthfull');await advanced.waitFor({state:'visible'});
 await lib.evaluate(el=>Object.assign(el.style,{left:'10px',top:'160px',width:'1000px',height:'800px'}));
 await advanced.evaluate(el=>Object.assign(el.style,{left:'450px',top:'100px',transform:'none'}));
 await lib.locator('.vltitle').click();
 assert.equal(await lib.evaluate(el=>el.style.zIndex),'70');
 assert.equal(await advanced.evaluate(el=>el.style.zIndex),'69');
 await advanced.locator('.sfhead').click({position:{x:35,y:12}});
 assert.equal(await advanced.evaluate(el=>el.style.zIndex),'70');
 assert.equal(await lib.evaluate(el=>el.style.zIndex),'69');
 // Add-track selector is another independently raised window, not a modal child.
 await page.getByRole('button',{name:'Add track',exact:true}).click();
 const picker=page.locator('#voicepicker');await picker.waitFor({state:'visible'});
 await picker.evaluate(el=>Object.assign(el.style,{left:'20px',top:'180px',width:'850px',height:'650px'}));
 assert.equal(await picker.evaluate(el=>el.style.zIndex),'70');
 const topAt=()=>page.evaluate(()=>document.elementFromPoint(600,350)?.closest('[data-preset-window]')?.id);
 assert.equal(await topAt(),'voicepicker');
 await advanced.locator('.sfhead').click({position:{x:35,y:12}});
 assert.ok(await picker.isVisible(),'Clicking Advanced must keep the selector open');
 assert.equal(await topAt(),'synthfull');
 await picker.locator('.voicewho').click();
 assert.equal(await topAt(),'voicepicker');
 assert.ok(await advanced.isVisible());
 await page.screenshot({path:root+'overlap-selector-front.png'});
 await advanced.locator('.sfhead').click({position:{x:35,y:12}});
 assert.equal(await topAt(),'synthfull');
 await page.screenshot({path:root+'overlap-advanced-front.png'});
 assert.deepEqual(errors,[]);
 console.log('PRESET WINDOW STACK: PASSED (library, selector, Advanced; opening and repeated click-to-front; selector stays open)');
}finally{await browser.close();}
