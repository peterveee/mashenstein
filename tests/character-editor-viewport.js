import { aspectRatio, measureViewport } from '../tools/lib/character-editor-viewport.js';

const ok = (condition, message) => { if (!condition) throw new Error(message); };
const wide = measureViewport({ width: 1200, height: 700, dpr: 2, zoom: 1 });
const tall = measureViewport({ width: 500, height: 900, dpr: 3, zoom: 1.8 });
ok(wide.backingW === 2400 && wide.backingH === 1400, 'wide backing store does not follow CSS size');
ok(wide.drawH > 0 && tall.drawH > wide.drawH, 'zoom or available height did not increase logical draw height');
ok(tall.density === 3, 'pixel density was not capped/selected correctly');
ok(Math.abs(aspectRatio(wide) - 1200 / 700) < 1e-9, 'viewport aspect ratio changed');
const noStretch = measureViewport({ width: 1000, height: 300, zoom: 1 });
ok(noStretch.drawH <= noStretch.cssH, 'logical character exceeds its CSS frame before zoom');
console.log('CHARACTER EDITOR VIEWPORT: PASSED');
