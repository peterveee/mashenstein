import assert from 'node:assert/strict';
import { generateBanger, modifyBanger } from '../tools/lib/banger/index.js';
import { bangerReportHtml } from '../tools/mixer-banger-report.js';
import { bangerSource } from '../tools/lib/banger-file.js';

const riff = { version: 1, source: { id: 'report', title: '<SPACE>', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Pluck', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null,
    bars: ['A4:1 . . . E5:1 . . . C5:1 . . . . . . .', 'F4:1 . . . C5:1 . . . A4:1 . . . . . . .'] }] };
const make = mode => generateBanger({ riff, options: { style: 'trance', production: { mode }, expression: { autoPortamento: true } }, seed: 7 });
const out = make('adventurous');
const b = JSON.parse(JSON.stringify(out.banger));
const track = { title: '<SPACE>', bank: out.bank, banger: b };
const html = bangerReportHtml(track, out.mix);
assert.ok(html.includes('Why these effects?') && html.includes('Song shape') && html.includes('Balance decisions'));
assert.ok(html.includes('As rolled') && !html.includes('Mixer differs'));
const reordered = structuredClone(out.mix);
for (const strip of Object.values(reordered.lanes)) {
  const entries = Object.entries(strip).reverse();
  for (const key of Object.keys(strip)) delete strip[key];
  Object.assign(strip, Object.fromEntries(entries));
  if (strip.gain === 0) delete strip.gain;
}
assert.ok(!bangerReportHtml(track, reordered).includes('Mixer differs'), 'saving property order and neutral faders are not edits');
assert.ok(html.includes('&lt;SPACE&gt;') && !html.includes('<SPACE>'), 'titles are escaped');
assert.ok(bangerSource({ id: 'report', title: 'Report', generated: out }).includes('"report"'), 'roll evidence survives song-file serialization');
const lane = b.laneOf.hook;
out.mix.lanes[lane].gain = 13;
assert.notEqual(b.report.lanes.find(x => x.role === 'hook').strip.gain, 13, 'report snapshot does not follow mixer edits');
assert.ok(bangerReportHtml(track, out.mix).includes('Mixer differs from recorded roll'));
const style = make('style');
assert.ok(bangerReportHtml({ banger: style.banger }, style.mix).includes('No extra treatments: Keep Style'));
const older = structuredClone(track); delete older.banger.report; delete older.banger.trackEffects;
assert.ok(bangerReportHtml(older, out.mix).includes('unrecorded choices have not been reconstructed'));
const merged = modifyBanger({ current: { bank: out.bank, mix: out.mix, arrangement: out.arrangement, banger: b }, next: style, base: b.prints });
assert.equal(merged.ok, true);
assert.deepEqual(merged.banger.report.lastModify, merged.report);
assert.ok(merged.banger.report.lanes.every(x => merged.banger.laneOf[x.role] === x.lane));
console.log('banger report: PASSED');
