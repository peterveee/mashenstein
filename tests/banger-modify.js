// MODIFY THIS TAKE (tools/lib/banger/modify.js): a take re-made with changed settings,
// keeping every part the change does not reach — hand edits, mix and automation with it.
import {
  generateBanger, modifyBanger, describeModify, BANGER_REROLLS, BANGER_GROUPS, BANGER_STRUCTURE, keepStructure,
  normaliseBangerOptions, goCrazyBangerOptions,
} from '../tools/lib/banger/index.js';
import { laneKeysOf, songSlots } from '../tools/lib/banger/modify.js';
import { arrangementIssues } from '../src/data/arrangements.js';
import { LANE_KEYS } from '../src/engine/lanes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
}

const riff = {
  version: 1, source: { id: 'test', title: 'TEST', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null,
    bars: ['A4:2 . . . E5:2 . . . C5:2 . . . G4:2 . . .', 'F4:2 . . . A4:2 . . . C5:4 . . . B4:2 . . .'] }],
};
const SEED = 7;
const made = generateBanger({ riff, options: {}, seed: SEED });
// The take as the desk holds it: saved, with a hand edit in the arrangement layer (the
// hook's first note moved — sections past the bank's are the desk's own), a fader moved
// on the bass and the arp muted in its strip.
const hookLane = made.laneOf.hook;
const edited = structuredClone(made.bank.sections[0]);
edited[hookLane] = [...edited[hookLane]];
edited[hookLane][0] = 466.16;
const current = {
  bank: made.bank,
  mix: structuredClone(made.mix),
  arrangement: { ...structuredClone(made.arrangement), sections: [edited], order: made.bank.order.map((s, i) => (i === 0 ? made.bank.sections.length : s)) },
  banger: made.banger,
};
current.mix.lanes[made.laneOf.bass].gain = -7.5;
const songOf = (r) => ({ bank: r.bank, arrangement: r.arrangement });
const laneData = (song, lane) => JSON.stringify(songSlots(song.bank, song.arrangement)
  .map((s) => laneKeysOf(s.sec, lane).sort().map((k) => [k.slice(lane.length), s.sec[k]])));

assert(made.banger.prints?.roles?.hook?.notes && made.banger.prints.master, 'a banger stores a fingerprint of every part as it was made');

// ---- adding a counter-melody: the counter comes in, nothing else moves
{
  const next = generateBanger({ riff, options: { ...made.banger.options, parts: { ...made.banger.options.parts, counter: true } }, seed: SEED });
  const out = modifyBanger({ current, next, base: made.banger.prints });
  assert(out.ok, 'turning the counter-melody on is a modification, not a rebuild');
  const r = out.report;
  assert(r.added.length === 1 && /COUNTER/.test(r.added[0]) && !r.replaced.length && !r.removed.length,
    `only the counter-melody comes in (${describeModify(r)})`);
  const lane = out.banger.laneOf.counter;
  const lanesOf = (r) => [...new Set([...LANE_KEYS, ...(r.mix.layers || []).map((l) => l.key)])];
  assert(lane && !Object.values(made.laneOf).includes(lane) && lanesOf(out).includes(lane), `it gets a free lane of its own (${lane})`);
  assert(laneData(songOf(out), lane) === laneData(songOf(next), next.laneOf.counter), 'the counter plays what the generator wrote for it');
  assert(songSlots(out.bank, out.arrangement)[0].sec[hookLane][0] === 466.16, 'the hand edit on the hook is kept');
  assert(Object.entries(made.laneOf).filter(([role]) => role !== 'hook')
    .every(([, l]) => laneData(songOf(out), l) === laneData(songOf(current), l)), 'every other part plays exactly as before');
  assert(out.mix.lanes[made.laneOf.bass].gain === -7.5, 'the bass fader stays where it was moved');
  assert(out.mix.order.includes(lane) && out.mix.voice[`${lane}Voice`] && out.mix.labels[lane], 'the counter has a strip, a sound and a name');
  assert(!out.arrangement.sections && !out.arrangement.order, 'the hand edits are folded into the music, not left in a layer that no longer lines up');
  assert(!arrangementIssues(out.bank, out.arrangement, lanesOf(out)).length, 'the result is a valid song');
}

// ---- re-rolling the arp: the arp is drawn again and nothing else
{
  const rerolls = { arps: 12345 };
  const next = generateBanger({ riff, options: made.banger.options, seed: SEED, rerolls });
  const out = modifyBanger({ current, next, base: made.banger.prints });
  const arp = made.laneOf.arp;
  assert(out.ok && out.report.replaced.length === 1 && out.report.replaced[0].startsWith('ARP'),
    `re-rolling the arp rewrites the arp alone (${describeModify(out.report)})`);
  assert(laneData(songOf(out), arp) !== laneData(songOf(current), arp), 'and the arp is a different one');
  assert(out.banger.rerolls?.arps === 12345, 'the re-roll is kept in the recipe');
  assert(BANGER_REROLLS.some((x) => x.stream === 'arps'), 'the arp is on the re-roll list');
}

// ---- the modification wins over a hand edit, and says so
{
  const next = generateBanger({ riff, options: { ...made.banger.options, variation: 'wild' }, seed: SEED });
  const out = modifyBanger({ current, next, base: made.banger.prints });
  const hookName = made.mix.labels[hookLane].split(' · ')[0];
  assert(out.ok && out.report.replaced.includes(hookName), `a new variation rewrites the hook (${hookName})`);
  assert(out.report.handEdited.length === 1 && out.report.handEdited[0] === hookName, 'and names the hand-edited hook it replaced — the only part edited by hand');
  assert(laneData(songOf(out), hookLane) === laneData(songOf(next), next.laneOf.hook), 'the hook is the new one');
}

// ---- nothing changed, nothing moves
{
  const next = generateBanger({ riff, options: made.banger.options, seed: SEED });
  const out = modifyBanger({ current, next, base: made.banger.prints });
  assert(out.ok && describeModify(out.report) === 'nothing in the music changed', 'the same settings change nothing');
}

// ---- a different length cannot line up, and says why
{
  const next = generateBanger({ riff, options: { ...made.banger.options, length: made.banger.options.length === 'long' ? 'short' : 'long' }, seed: SEED });
  const out = modifyBanger({ current, next, base: made.banger.prints });
  assert(!out.ok && /bars/.test(out.reason), `a new length is refused with a reason (${out.reason})`);
}

// ---- the shape is locked: what Modify leaves open never moves a section
{
  const shapeOf = (o) => JSON.stringify(generateBanger({ riff, options: o, seed: 2 }).form.map((f) => [f.role, f.from, f.to]));
  const moved = [];
  for (const style of ['big-room', 'trance', 'eurobeat']) {
    for (const template of ['club', 'pop', 'anthem']) {
      const base = normaliseBangerOptions({ style, form: { template } }).options;
      const ref = shapeOf(base);
      for (const g of BANGER_GROUPS) {
        for (const f of g.fields) {
          if (g.id === 'form' && BANGER_STRUCTURE.form.includes(f.key)) continue;
          for (const v of f.type === 'select' ? f.options.map((x) => x[0]) : [true, false]) {
            const o = structuredClone(base);
            o[g.id][f.key] = v;
            if (shapeOf(o) !== ref) moved.push(`${style}/${template} ${g.id}.${f.key}=${v}`);
          }
        }
      }
    }
  }
  assert(!moved.length, `no setting Modify leaves open moves a section (${moved.slice(0, 4).join('; ') || 'none'})`);
  const crazy = keepStructure(goCrazyBangerOptions(made.banger.options), made.banger.options);
  assert(crazy.form.falseEnding === made.banger.options.form.falseEnding && crazy.length === made.banger.options.length
    && crazy.variation === 'wild' && crazy.parts.counter, 'Go Crazy in Modify keeps the shape and changes everything else');
  const out = modifyBanger({ current, next: generateBanger({ riff, options: crazy, seed: SEED }), base: made.banger.prints });
  assert(out.ok, 'and the modified take lines up with the old one');
}

console.log(failed ? '\nbanger modify: FAILED' : '\nbanger modify: PASSED');
process.exit(failed ? 1 : 0);
