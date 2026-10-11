import assert from 'node:assert/strict';
import { pickSmoothieMenu, SMOOTHIE_DUDS, SMOOTHIE_ROWS, SMOOTHIES } from '../src/sprites/stalls.js';

function menuWords(name) {
  return new Set(name.toUpperCase().replace(/[’']/g, '').match(/[A-Z0-9]+/g).map((word) => {
    if (word === 'BERRIES' || word.endsWith('BERRY')) return 'BERRY';
    if (word === 'PLUMS') return 'PLUM';
    return word;
  }));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

for (let seed = 0; seed < 1000; seed++) {
  const menu = pickSmoothieMenu(seededRandom(seed));
  assert.equal(menu.length, SMOOTHIE_ROWS, `seed ${seed}: keep all board rows`);
  assert.equal(menu.slice(0, -1).length, 6, `seed ${seed}: keep six regular smoothies`);
  assert(menu.slice(0, -1).every(([name]) => SMOOTHIES.some(([candidate]) => candidate === name)),
    `seed ${seed}: regular entries come from the menu`);
  assert(SMOOTHIE_DUDS.some(([name]) => name === menu.at(-1)[0]), `seed ${seed}: the dud stays last`);

  const owners = new Map();
  for (const [name, price] of menu) {
    assert.match(price, /^\d+ PLUGS?$/, `seed ${seed}: preserve displayed price for ${name}`);
    for (const word of menuWords(name)) {
      assert(!owners.has(word), `seed ${seed}: ${name} repeats "${word}" from ${owners.get(word)}`);
      owners.set(word, name);
    }
  }
}

console.log('ok: 1000 random smoothie boards have no repeated words or fruit families');
