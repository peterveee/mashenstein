// MAKE A BANGER — the seed bangers, from the command line. 2 Oct 2026.
//
//   node tools/banger-seeds.js make [style …]      make each style's seed banger (every style
//                                                  when none is named); one already made is
//                                                  left alone
//         --force                                  make it again — its tuning is lost
//   node tools/banger-seeds.js use <style>         Use as Style, as the desk's button does
//   node tools/banger-seeds.js combos              list the Sound Combos
//   node tools/banger-seeds.js delete-combo <style> <combo>   delete one
//
// A seed is a song in src/data/imported on the desk's Style Seeds shelf: tune it there, then
// Use as Style (the drawer) makes new bangers start from it. See tools/lib/banger-seeds.js.
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BANGER_STYLES, styleFor } from './lib/banger/styles/index.js';
import { makeSeed, useAsStyle, deleteCombo, seedIdOf, COMBOS_FILE } from './lib/banger-seeds.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const command = argv[0];
const named = argv.slice(1).filter((a) => !a.startsWith('--'));

if (command === 'make') {
  const styles = named.length ? named.map((id) => styleFor(id) || (console.error(`no style called ${id}`), process.exit(1))) : BANGER_STYLES;
  for (const style of styles) {
    try {
      const { file } = makeSeed(ROOT, style, { force: argv.includes('--force') });
      console.log(`made ${file}`);
    } catch (err) {
      console.log(`${style.label}: ${err.message}`);
    }
  }
} else if (command === 'use') {
  const id = named[0]?.startsWith('banger-seed-') ? named[0] : seedIdOf(named[0] || '');
  // A sound tuned on the seed is kept as a preset of its own, measured as the desk measures
  // one — through a renderer of this process's own, started fresh after each write.
  const { openRenderer } = await import('./lib/render-bank-browser.js');
  const { measureVoiceAt, homeLane } = await import('./lib/measure-voice.js');
  const { readMeasured } = await import('./lib/voices-source.js');
  let renderer = null;
  const measure = async (vid, preset, src) => {
    renderer ||= await openRenderer();
    const voice = { ...preset, id: vid, ...readMeasured(src, vid) };
    return measureVoiceAt(renderer.render, voice, homeLane(voice));
  };
  const restart = async () => { if (renderer) { await renderer.close(); renderer = null; } };
  let r;
  try { r = await useAsStyle(ROOT, id, { measure, restart }); } finally { await restart(); }
  if (!r.ok) { console.error(`not used:\n  ${r.problems.join('\n  ')}`); process.exit(1); }
  console.log(`${r.style} now starts from ${id}: ${r.changed.sounds} sounds changed, ${r.changed.channels} channels, the master`);
} else if (command === 'combos') {
  const { BANGER_COMBOS } = await import(`${pathToFileURL(join(ROOT, COMBOS_FILE)).href}?v=${Date.now()}`);
  for (const [style, combos] of Object.entries(BANGER_COMBOS)) {
    for (const [id, c] of Object.entries(combos)) console.log(`${style.padEnd(12)} ${id.padEnd(24)} ${c.label} — from ${c.from}, ${c.made.slice(0, 10)}`);
  }
} else if (command === 'delete-combo') {
  const [style, combo] = named;
  if (!(await deleteCombo(ROOT, style, combo))) { console.error(`${style} has no combo called ${combo}`); process.exit(1); }
  console.log(`deleted the ${style} combo ${combo}`);
} else {
  console.error('usage: node tools/banger-seeds.js make [style …] [--force] | use <style> | combos | delete-combo <style> <combo>');
  process.exit(1);
}
