import { chromium } from '/Users/Peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 700, height: 500 }, deviceScaleFactor: 3 });
await p.goto('file:///Users/Peter/mashenstein/galleries/poyo-pikachu-concept.html');
await p.waitForTimeout(400);
// The RUN tile is the 2nd card of the 2nd section.
const runCard = p.locator('section').nth(1).locator('.card').nth(1);
// find a t where the run bounce is near its extremes by sampling two phases.
await p.waitForTimeout(100); await runCard.screenshot({ path: 'scratchpad/run1.png' });
await p.waitForTimeout(156); await runCard.screenshot({ path: 'scratchpad/run2.png' }); // ~half of a 0.31s stride-beat
await b.close();
console.log('done');
