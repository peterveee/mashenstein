// VOLUME AUTOMATION AS DATA — src/data/automation.js and the desk's edits to it.
//
// tests/mix-automation.js proves what the engine does with a line and a cut, off the
// rendered samples. This proves the line itself: that the curves are the curves, that it
// holds past its ends, and — the part that goes wrong quietly — that every edit which
// inserts, removes, repeats or pastes bars carries the points with the music they were on,
// the way the loop markers are carried. Positions are sixteenths from the top, so an
// edit that forgot to move them would leave a fade-out sitting on the wrong bars with
// nothing on screen to say it had slipped.
import {
  AUTOMATION_FLOOR_DB, posOf, barStepOf, shapeLevel, laneCurve, curveLevelAt, curveDbAt,
  setLaneFade, clearLaneRange, addLaneCut, removeLaneCut, moveLaneCut, shiftAutomation,
  copyAutomationRange, pasteAutomation, tidyPoints, hasAutomation, automationIssues,
  positionLabel, levelLabel, replaceFxRange, laneFx, fxSectionAt, fxEdgesBetween, fxStartsAt, isBusKey,
} from '../src/data/automation.js';
import { applyArrangement, arrangementIssues } from '../src/data/arrangements.js';
import {
  draftOf, entryOf, setFade, setCrossfade, clearAutomation, addCut, removeCut,
  deleteBars, insertSilence, duplicateBars, copyBars, pasteBars, removeLanes,
  copyLaneArrangement, automationDbAt, setBarSections, setBarEffects, barSections,
  putBarSections,
} from '../tools/lib/arrangement-edit.js';
import { bankSource } from '../tools/lib/song-source.js';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const dB = (g) => (g > 0 ? 20 * Math.log10(g) : -Infinity);

// ---- positions ------------------------------------------------------------------
assert(posOf(1, 0) === 0 && posOf(2, 0) === 16 && posOf(3, 8.5) === 40.5,
  'a position is sixteenths from the top: bar 1 is 0, bar 2 is 16, bar 3 step 8.5 is 40.5');
assert(JSON.stringify(barStepOf(40.5)) === '[3,8.5]' && JSON.stringify(barStepOf(16)) === '[2,0]',
  'and back to [bar, step]');
assert(positionLabel(posOf(12, 6)) === '12.2.3', 'bar 12 step 6 reads as 12.2.3 — bar, beat, sixteenth');
assert(levelLabel(null) === '−∞' && levelLabel(-6) === '-6 dB' && levelLabel(3) === '+3 dB',
  'levels read as dB, silence as −∞');

// ---- the shapes -------------------------------------------------------------------
assert(near(dB(shapeLevel('even', 1, 0, 0.5)), AUTOMATION_FLOOR_DB / 2, 1e-9),
  `an Even fade to silence is halfway down in dB at halfway (${AUTOMATION_FLOOR_DB / 2} dB)`);
assert(shapeLevel('even', 1, 0, 1) === 0 && shapeLevel('even', 0, 1, 0) === 0,
  'and is silent at its silent end, not merely at the floor');
{
  let worst = 0;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const out = shapeLevel('equal', 1, 0, t);
    const into = shapeLevel('equal', 0, 1, t);
    worst = Math.max(worst, Math.abs(out * out + into * into - 1));
  }
  assert(worst < 1e-9, 'an Equal-power crossfade holds the summed power at 1 all the way across');
}
assert(near(dB(shapeLevel('s', 1, 10 ** (-24 / 20), 0.5)), -12, 1e-9)
  && dB(shapeLevel('s', 1, 10 ** (-24 / 20), 0.1)) > -24 * 0.1,
  'an S-curve is symmetric about its middle and starts slower than a straight line');

// ---- the line --------------------------------------------------------------------
{
  const auto = setLaneFade(null, 'pad', posOf(9), posOf(13), 0, null, 'even');
  const curve = laneCurve(auto.pad);
  assert(JSON.stringify(auto) === JSON.stringify({ pad: { points: [[9, 0, 0], [13, 0, null], [13, 0, 0]] } }),
    'a fade-out over bars 9–12 is its two ends and the step back to where the line was, written the way the file reads');
  assert(curveLevelAt(curve, 0) === 1 && curveLevelAt(curve, posOf(9)) === 1,
    'before the fade the track is where it was');
  assert(curveLevelAt(curve, posOf(13), { left: true }) === 0 && curveLevelAt(curve, posOf(13)) === 1
    && curveLevelAt(curve, posOf(40)) === 1,
    'it reaches silence at the end of bar 12, and bar 13 on is where it was — a fade changes only its own bars');
  assert(near(curveDbAt(curve, posOf(11)), -24, 1e-6), 'halfway through it is at -24 dB');

  // Bars 45–49, on a track with no line yet — the case that silenced a whole song.
  const into = setLaneFade(null, 'lead', posOf(45), posOf(50), null, 0, 'equal');
  const ic = laneCurve(into.lead);
  assert(curveLevelAt(ic, 0) === 1 && curveLevelAt(ic, posOf(44, 15)) === 1
    && curveLevelAt(ic, posOf(45)) === 0 && curveLevelAt(ic, posOf(50)) === 1
    && curveLevelAt(ic, posOf(60)) === 1,
    'a fade-in over bars 45–49 leaves bars 1–44 at full level: silent on the downbeat of 45, full again by 50');
  // And on a track whose line was already down: the bars either side keep THAT level.
  const down = setLaneFade({ lead: { points: [[1, 0, -12]] } }, 'lead', posOf(9), posOf(11), null, 0);
  const dc = laneCurve(down.lead);
  assert(near(curveDbAt(dc, posOf(8)), -12, 1e-9) && near(curveDbAt(dc, posOf(11)), -12, 1e-9)
    && near(curveDbAt(dc, posOf(30)), -12, 1e-9),
    'on a line already at -12 dB, a fade leaves the bars before AND after it at -12');

  // A step: two points at the same place — the first is where the line arrives from the
  // left, the second where it leaves.
  const step = { pad: { points: [[1, 0, 0], [5, 0, -12], [5, 0, null]] } };
  const sc = laneCurve(step.pad);
  assert(near(curveDbAt(sc, posOf(5), { left: true }), -12, 1e-9) && curveLevelAt(sc, posOf(5)) === 0,
    'a step reads its left value arriving and its right value leaving');

  // Replacing the middle of a line leaves the line either side of it exactly as it was.
  const after = setLaneFade(auto, 'pad', posOf(10), posOf(12), -6, -18);
  const ac = laneCurve(after.pad);
  assert(near(curveDbAt(ac, posOf(9, 8)), curveDbAt(curve, posOf(9, 8)), 1e-6)
    && near(curveDbAt(ac, posOf(10)), -6, 1e-9)
    && near(curveDbAt(ac, posOf(12), { left: true }), -18, 1e-9)
    && near(curveDbAt(ac, posOf(12, 8)), curveDbAt(curve, posOf(12, 8)), 1e-6),
    'a fade drawn inside a line replaces only its own stretch; the line either side is untouched');

  assert(clearLaneRange(auto, 'pad', 0, posOf(20)) === null,
    'clearing the only fade leaves no automation at all — no empty key in the file');
  assert(tidyPoints([{ pos: 0, db: 0 }, { pos: 16, db: 0 }, { pos: 16, db: 0 }, { pos: 32, db: 0 }]).length === 3,
    'tidying takes out an exact repeat and nothing else — a point on a flat line is an anchor somebody placed');
}

// ---- cuts ------------------------------------------------------------------------
{
  let auto = addLaneCut(null, 'crash', posOf(12, 6));
  auto = addLaneCut(auto, 'crash', posOf(12, 6));
  assert(JSON.stringify(auto) === JSON.stringify({ crash: { cuts: [[12, 6]] } }),
    'a cut is [bar, step], and a second cut in the same place is the same cut');
  auto = moveLaneCut(auto, 'crash', posOf(12, 6), posOf(12, 8.5));
  assert(JSON.stringify(auto.crash.cuts) === '[[12,8.5]]', 'a cut moves to a 1/32');
  assert(removeLaneCut(auto, 'crash', posOf(12, 8.5)) === null, 'and removing the last one removes the key');
}

// ---- structure ---------------------------------------------------------------------
{
  const fade = { pad: { points: [[9, 0, 0], [13, 0, null]], cuts: [[14, 6]] } };
  // Four bars inserted at bar 3 (before the fade): everything moves four bars later.
  const ins = shiftAutomation(fade, posOf(3), { added: 64 });
  assert(JSON.stringify(ins) === JSON.stringify({ pad: { points: [[13, 0, 0], [17, 0, null]], cuts: [[18, 6]] } }),
    'bars inserted ahead of a fade push it later, cut and all');
  // Two bars inserted INSIDE the fade, at bar 11: the fade is split, and the inserted
  // bars hold the level the line had arriving there.
  const mid = shiftAutomation(fade, posOf(11), { added: 32 });
  const mc = laneCurve(mid.pad);
  const oc = laneCurve(fade.pad);
  assert(near(curveDbAt(mc, posOf(12)), curveDbAt(oc, posOf(11)), 1e-6)
    && near(curveDbAt(mc, posOf(10)), curveDbAt(oc, posOf(10)), 1e-6)
    && near(curveDbAt(mc, posOf(14)), curveDbAt(oc, posOf(12)), 1e-6),
    'bars inserted inside a fade hold its level there, and the line either side is unchanged');
  // Bars 5–6 deleted: the fade moves two bars earlier.
  const del = shiftAutomation(fade, posOf(5), { removed: 32 });
  assert(JSON.stringify(laneCurve(del.pad).points.map((p) => [p.pos, p.db]))
    === JSON.stringify([[posOf(7), 0], [posOf(11), null]])
    && JSON.stringify(del.pad.cuts) === '[[12,6]]',
    'bars deleted ahead of a fade pull it earlier');
  // Deleting bars 10–11, inside it: the line either side is kept exactly, meeting in a step.
  const cutOut = shiftAutomation(fade, posOf(10), { removed: 32 });
  const cc = laneCurve(cutOut.pad);
  assert(near(curveDbAt(cc, posOf(10), { left: true }), curveDbAt(oc, posOf(10)), 1e-6)
    && near(curveDbAt(cc, posOf(10)), curveDbAt(oc, posOf(12)), 1e-6),
    'bars deleted from inside a fade leave both sides of it exactly, joined by a step');

  // A clip of bars 9–12 pasted into four new bars at 13: the fade happens twice.
  const clip = copyAutomationRange(fade, posOf(9), posOf(13));
  const twice = pasteAutomation(shiftAutomation(fade, posOf(13), { added: 64 }), posOf(13), clip, 1);
  const tc = laneCurve(twice.pad);
  assert(curveLevelAt(tc, posOf(13)) === 1 && near(curveDbAt(tc, posOf(15)), -24, 1e-6)
    && curveLevelAt(tc, posOf(17)) === 0 && near(curveDbAt(tc, posOf(11)), -24, 1e-6),
    'a pasted copy of a fade-out fades out again, starting back at the top');
}

// ---- the draft and the file ----------------------------------------------------------
{
  // A bare two-bar bank played eight times: sixteen bars, nothing else arranged.
  const bank = { bpm: 120, lead: new Array(32).fill(null), pad: new Array(32).fill(null), order: [0, 0, 0, 0, 0, 0, 0, 0] };
  let draft = draftOf(bank, null);
  assert(entryOf(bank, draft) === null, 'an untouched song has no arrangement entry');
  draft = setFade(draft, 'pad', posOf(9), posOf(13), 0, null, 'even');
  const entry = entryOf(bank, draft);
  assert(JSON.stringify(Object.keys(entry)) === '["automation"]',
    'a fade on an otherwise untouched song is an entry of its own, and only that');
  assert(automationDbAt(draftOf(bank, entry), 'pad', posOf(11)) === -24, 'and reads back through the draft');

  const cross = setCrossfade(draftOf(bank, null), 'pad', 'lead', posOf(5), posOf(7));
  const pc = laneCurve(cross.automation.pad);
  const lc = laneCurve(cross.automation.lead);
  assert(curveLevelAt(lc, posOf(5)) === 0 && curveLevelAt(lc, posOf(7), { left: true }) === 1
    && curveLevelAt(pc, posOf(7), { left: true }) === 0
    && near(curveLevelAt(pc, posOf(6)) ** 2 + curveLevelAt(lc, posOf(6)) ** 2, 1, 1e-9),
    'a crossfade takes one track out and the other in, power held across the middle');
  assert(curveLevelAt(lc, 0) === 1 && curveLevelAt(pc, 0) === 1 && curveLevelAt(pc, posOf(8)) === 1,
    'and, like every fade, touches neither track outside its bars');

  const cut = addCut(draft, 'pad', posOf(14, 6));
  assert(JSON.stringify(entryOf(bank, cut).automation.pad.cuts) === '[[14,6]]', 'a cut is written with the fade');
  assert(entryOf(bank, removeCut(cut, 'pad', posOf(14, 6))).automation.pad.cuts === undefined,
    'and taken away again');

  // Structure edits move the line with the music.
  const deleted = deleteBars(cut, 0, 1);
  assert(JSON.stringify(deleted.automation.pad.points) === '[[7,0,0],[11,0,null],[11,0,0]]'
    && JSON.stringify(deleted.automation.pad.cuts) === '[[12,6]]',
    'Delete Bars 1–2 moves the fade and the cut two bars earlier');
  const silence = insertSilence(cut, 0, 2);
  assert(JSON.stringify(silence.automation.pad.points) === '[[11,0,0],[15,0,null],[15,0,0]]',
    'Insert Silence at bar 1 moves them two bars later');
  const repeated = duplicateBars(cut, 8, 11, 1);
  const rc = laneCurve(repeated.automation.pad);
  assert(repeated.plan.length === 20 && curveLevelAt(rc, posOf(13), { left: true }) === 0
    && curveLevelAt(rc, posOf(13)) === 1
    && near(curveDbAt(rc, posOf(15)), -24, 1e-6) && curveLevelAt(rc, posOf(17), { left: true }) === 0
    && curveLevelAt(rc, posOf(17)) === 1
    && JSON.stringify(repeated.automation.pad.cuts) === '[[18,6]]',
    'Repeat bars 9–12 plays the fade-out twice and moves the cut after it');
  const clip = copyBars(bank, cut, 8, 11);
  const pasted = pasteBars(bank, cut, 0, clip);
  assert(near(automationDbAt(pasted, 'pad', posOf(3)), -24, 1e-6)
    && automationDbAt(pasted, 'pad', posOf(4, 8)) != null,
    'Copy and Paste of bars 9–12 brings the fade with them');
  assert(removeLanes(cut, ['pad']).automation === null, 'Delete Track takes its fades and cuts with it');
  assert(JSON.stringify(copyLaneArrangement(cut, 'pad', 'pad2').automation.pad2)
    === JSON.stringify(cut.automation.pad), 'Duplicate gives the copy the same line and cuts');
  assert(clearAutomation(cut, 'pad', 0, posOf(17)).automation === null,
    'clearing a range takes both the fade and the cut out of it');

  // Through the file format and back.
  const src = `(${bankSource(entry)})`;
  // eslint-disable-next-line no-eval
  const back = (0, eval)(src);
  assert(JSON.stringify(back) === JSON.stringify(entry), 'the song file writes it and reads it back exactly');
  assert(/points: \[\[9,0,0\],\[13,0,null\],\[13,0,0\]\]/.test(src), 'a line of points is one line in the file');

  const applied = applyArrangement(bank, 'x', { x: entry });
  assert(applied !== bank && applied.automation === entry.automation, 'the engine finds it on the bank');
  assert(applyArrangement(bank, 'x', { x: { automation: {} } }) === bank,
    'an empty automation map is no arrangement — the same bank comes back');
  assert(!hasAutomation({ pad: { points: [] } }), 'a lane with nothing on it asks for nothing');

  const laneKeys = ['lead', 'pad'];
  assert(!arrangementIssues(bank, entry, laneKeys).length, 'a real fade validates');
  const bad = arrangementIssues(bank, { automation: { nope: { points: [[1, 0, 0]] }, pad: { points: [[40, 0, 0, 'wobble']], cuts: [[2, 17]] } } }, laneKeys);
  assert(bad.some((m) => /not a lane/.test(m)) && bad.some((m) => /unknown shape/.test(m))
    && bad.some((m) => /not a bar and a step/.test(m)),
    `a bad one says why (${bad.length} issues)`);
  assert(automationIssues(null).length === 0, 'no automation is nothing wrong');
}

// ---- effect sections -------------------------------------------------------------------
//
// The same positions, carrying a chain instead of a level: a lane's `fx`, and the master's.
// tests/fx-sections.js proves what the engine plays; this proves they travel with the music.
{
  const stutter = [{ id: 'stutter', params: { slice: 0.25 } }];
  const crush = [{ id: 'bitcrusher', params: { bits: 6 } }];
  const fx = (a, b, chain = stutter) => ({ from: a, to: b, chain });
  const sections = (auto, key) => JSON.stringify(laneFx(auto, key).map((s) => [s.from, s.to]));

  let auto = replaceFxRange(null, '__master', posOf(2), posOf(4), [fx(posOf(2, 12), posOf(3))]);
  assert(JSON.stringify(auto) === '{"__master":{"fx":[{"from":[2,12],"to":[3,0],"chain":[{"id":"stutter","params":{"slice":0.25}}]}]}}',
    'a section is written as two places and a chain, under the lane it plays on — the master included');
  auto = replaceFxRange(auto, '__master', posOf(3), posOf(4), [fx(posOf(3, 0), posOf(3, 0.5), crush)]);
  const curve = laneCurve(auto.__master);
  assert(fxSectionAt(curve, posOf(2, 11.9)) === null && fxSectionAt(curve, posOf(2, 12))?.chain === auto.__master.fx[0].chain
    && fxSectionAt(curve, posOf(3, 0.25))?.chain[0].id === 'bitcrusher' && fxSectionAt(curve, posOf(3, 0.5)) === null,
    'a section plays from its start up to (not including) its end, on a 1/32 as well as a sixteenth');
  assert(JSON.stringify(fxEdgesBetween(curve, posOf(2, 11), posOf(3, 1))) === JSON.stringify([posOf(2, 12), posOf(3), posOf(3, 0.5)])
    && fxStartsAt(curve, posOf(3)) && !fxStartsAt(curve, posOf(2, 13)),
    'its edges are where a window has to switch, and its start is a start even where another ends');

  // Every edit to the level line or the cuts goes through the same writer; none may drop them.
  let both = setLaneFade(replaceFxRange(null, 'pad', 0, 64, [fx(posOf(2), posOf(3))]), 'pad', posOf(1), posOf(2), 0, -6);
  both = addLaneCut(both, 'pad', posOf(3, 4));
  assert(sections(both, 'pad') === JSON.stringify([[16, 32]]), 'a fade and a cut on the same track leave its sections alone');
  assert(sections(clearLaneRange(both, 'pad', 0, 64), 'pad') === JSON.stringify([[16, 32]])
    && !laneFx(clearLaneRange(both, 'pad', posOf(2, 8), 64, { fx: true }), 'pad').some((s) => s.to > posOf(2, 8)),
    'Clear Volume keeps them; a clear that asks for sections cuts them at the edge of its range');
  assert(sections(replaceFxRange(both, 'pad', posOf(2, 4), posOf(2, 8), []), 'pad') === JSON.stringify([[16, 20], [24, 32]]),
    'emptying the middle of a section leaves the two ends as two sections');

  // Structure.
  const one = { m: { fx: [{ from: [2, 0], to: [4, 0], chain: stutter }] } };
  assert(sections(shiftAutomation(one, posOf(1), { added: 16 }), 'm') === JSON.stringify([[32, 64]]),
    'bars inserted before a section move it later');
  assert(sections(shiftAutomation(one, posOf(3), { added: 16 }), 'm') === JSON.stringify([[16, 32], [48, 64]]),
    'bars inserted inside one split it round them — the new bars are not part of it');
  assert(sections(shiftAutomation(one, posOf(3), { removed: 16 }), 'm') === JSON.stringify([[16, 32]])
    && sections(shiftAutomation(one, posOf(1), { removed: 32 }), 'm') === JSON.stringify([[0, 16]]),
    'bars taken out of one shorten it, and out from under its start move what is left back');
  assert(shiftAutomation(one, posOf(2), { removed: 32 }) === null, 'and deleting all of its bars deletes it');
  const clip = copyAutomationRange(one, posOf(3), posOf(5));
  assert(JSON.stringify(clip.lanes.m.fx.map((s) => [s.from, s.to])) === '[[0,16]]',
    'a copy brings the part of a section inside the copied bars, as far as their edge');
  assert(sections(pasteAutomation(shiftAutomation(one, posOf(6), { added: 32 }), posOf(6), clip, 2), 'm')
    === JSON.stringify([[16, 48], [80, 96], [112, 128]]), 'and a paste lays it down once per copy');

  // Through the draft.
  const bank = { bpm: 120, lead: new Array(32).fill(null), pad: new Array(32).fill(null), order: [0, 0, 0, 0] };
  let draft = setBarEffects(draftOf(bank, null), 2, 3, 'pad', crush);
  draft = setBarSections(draft, 2, 2, 'pad', [fx(posOf(3, 12), posOf(4))]);
  assert(!draft.plan[2].inlineFx && JSON.stringify(draft.plan[3].inlineFx) === JSON.stringify({ pad: crush })
    && sections(draft.automation, 'pad') === JSON.stringify([[44, 48]]),
    'writing sections over bars takes those bars\' own snapshots away, and leaves the next bar\'s');
  draft = setBarSections(draft, 0, 1, '__master', [fx(0, posOf(1, 4))]);
  const entry = entryOf(bank, draft);
  assert(entry.automation.__master.fx.length === 1 && !arrangementIssues(bank, entry, ['lead', 'pad']).length,
    'the master\'s sections are an entry like any other and validate');
  assert(hasAutomation({ __master: { fx: [{ from: [1, 0], to: [1, 4], chain: stutter }] } })
    && applyArrangement(bank, 'x', { x: { automation: entry.automation } }).automation === entry.automation,
    'a song whose only arrangement is a section is still arranged — the engine finds it on the bank');
  assert(JSON.stringify(barSections(draft, 'pad', 2)) === JSON.stringify([{ from: 12, to: 16, chain: stutter }])
    && sections(putBarSections(draft, 'pad', 0, barSections(draft, 'pad', 2)).automation, 'pad') === JSON.stringify([[12, 16], [44, 48]]),
    'one bar\'s sections lift out relative to its top and lay down on another bar (Replicate, track paste)');
  assert(removeLanes(draft, ['pad']).automation?.pad === undefined
    && sections(copyLaneArrangement(draft, 'pad', 'pad2').automation, 'pad2') === JSON.stringify([[44, 48]]),
    'Delete Track takes a track\'s sections; Duplicate gives the copy the same ones');
  const reset = clearAutomation(draft, 'pad', posOf(1), posOf(5), { points: true, cuts: true, fx: true });
  assert(!reset.automation?.pad, 'Reset Edits takes them out with the fades and cuts');
  const src = `(${bankSource(entry)})`;
  // eslint-disable-next-line no-eval
  assert(JSON.stringify((0, eval)(src)) === JSON.stringify(entry), 'the song file writes them and reads them back exactly');

  const bad = automationIssues({
    __master: { points: [[1, 0, 0]], fx: [{ from: [1, 4], to: [1, 4], chain: stutter }] },
    pad: { fx: [{ from: [1, 0], to: [1, 4], chain: [] }, { from: [9, 0], to: [9, 4], chain: stutter }] },
  }, ['pad'], 4);
  assert(bad.some((m) => /master carries effect sections only/.test(m)) && bad.some((m) => /ends where it starts/.test(m))
    && bad.some((m) => /no valid chain/.test(m)) && bad.some((m) => /past bar 4/.test(m))
    && !bad.some((m) => /"__master", which is not a lane/.test(m)),
    `a bad section says why, and the master is never "not a lane" (${bad.length} issues)`);

  // GROUP BUSES (src/data/group-buses.js): a group's lane is a bus lane like the master's —
  // sections only, never "not a lane" — and a group that is not one of the four is refused.
  const groupOk = automationIssues({ '__group:group1': { fx: [{ from: [1, 0], to: [2, 0], chain: stutter }] } }, ['pad'], 4);
  assert(!groupOk.length, `a group's sections validate against a song's lanes (${groupOk.join('; ')})`);
  const groupBad = automationIssues({
    '__group:group2': { points: [[1, 0, -6]], cuts: [[2, 0]] },
    '__group:group9': { fx: [{ from: [1, 0], to: [2, 0], chain: stutter }] },
  }, ['pad'], 4);
  assert(groupBad.some((m) => /Group 2 carries effect sections only/.test(m))
    && groupBad.some((m) => /"__group:group9", which is not a group/.test(m))
    && !groupBad.some((m) => /which is not a lane/.test(m)),
    'a group carries sections only, and a group that does not exist is named as such');
  assert(isBusKey('__master') && isBusKey('__group:group3') && !isBusKey('__group:group9') && !isBusKey('pad'),
    'the master and the four groups are bus lanes; nothing else is');
  let gd = setBarEffects(draftOf(bank, null), 0, 1, 'pad', crush);
  gd = setBarSections(gd, 0, 0, '__group:group1', [fx(0, posOf(1, 8))]);
  assert(JSON.stringify(gd.plan[0].inlineFx) === JSON.stringify({ pad: crush })
    && sections(gd.automation, '__group:group1') === JSON.stringify([[0, 8]]),
    'writing a group\'s sections leaves the tracks\' own per-bar snapshots alone');
  assert(sections(shiftAutomation(gd.automation, posOf(1), { added: 16 }), '__group:group1') === JSON.stringify([[16, 24]]),
    'and inserting bars before it moves it along like any other section');
}

if (failed) process.exit(1);
console.log('\nautomation: all claims hold');
