import { build } from 'esbuild';
import { chromium } from 'playwright';
const bundle = await build({ stdin: { contents: `
import {entityInRenderBand,BASE_CULL_MARGIN,LOOP_CULL_MARGIN} from './src/game/run.js';
import {drawWorldEntity} from './src/game/draw.js';
import {OBSTACLES,PICKUPS,makeObstacle,makePickup} from './src/game/entities.js';
import {getStylePack} from './src/engine/stylePacks/index.js';
window.cullTest={entityInRenderBand,BASE_CULL_MARGIN,LOOP_CULL_MARGIN,drawWorldEntity,OBSTACLES,PICKUPS,makeObstacle,makePickup,getStylePack};`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife' });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  console.log(await page.evaluate(() => {
    const api = window.cullTest;
    const canvas = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; return c.getContext('2d', { willReadFrequently: true }); };
    const a = canvas(), b = canvas(); let checked = 0, culled = 0;
    const options = { preculled: true }, settings = { smoothMotion: true };
    const style = api.getStylePack('lcd', settings);
    const fixtures = [...Object.keys(api.OBSTACLES).map(k => api.makeObstacle(k, 0)),
      ...Object.keys(api.PICKUPS).map(k => api.makePickup(k, 0, 8))];
    for (const e of fixtures) for (const z of [1.3, 2.2]) for (const smear of [-14, 14]) {
      const cam = 100.375, view = 480 / z;
      const margin = e.def.isLoop ? api.LOOP_CULL_MARGIN : api.BASE_CULL_MARGIN;
      for (const x of [cam - e.w - margin - 0.01, cam - e.w - margin + 0.01,
        cam + view + margin - 0.01, cam + view + margin + 0.01]) {
        e.x = x;
        const keep = api.entityInRenderBand(e, cam, view);
        for (const ctx of [a,b]) {
          ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,480,270);
          ctx.setTransform(z,0,0,z,0,270 - 270*z);
        }
        const paint = ctx => {
          if (!e.def.isLoop && e.kind === 'obstacle') {
            ctx.save(); ctx.translate(smear, 0); ctx.globalAlpha = 0.3;
            api.drawWorldEntity(ctx,e,cam,1.25,style,settings,options); ctx.restore();
          }
          api.drawWorldEntity(ctx,e,cam,1.25,style,settings,options);
        };
        paint(a); if (keep) paint(b); else culled++;
        const reference = a.getImageData(0,0,480,270).data, actual = b.getImageData(0,0,480,270).data;
        for (let i=0;i<reference.length;i++) if (reference[i] !== actual[i]) throw Error(`clipped ${e.type}, zoom ${z}, smear ${smear}, x ${x}, channel ${i}`);
        checked++;
      }
    }
    return `ok: ${checked} real-canvas culling edge comparisons (${culled} rejected), all registered obstacles/pickups, both smear directions`;
  }));
} finally { await browser.close(); }
