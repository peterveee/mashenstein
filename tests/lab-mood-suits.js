// THE MOODS THAT SUIT A STYLE (tools/lib/banger/moods.js STYLE_MOODS, 10 Oct 2026). Held here: every
// style has a list of real moods, its own mood first; every mood suits some style; ELEMENT outlines
// the suited moods, and a pair when both its moods suit; with an INFUSION the outlines go on the
// moods both suit, or the infusion's where they share none. EXPERIMENT leans to the outlined moods and
// to each formula's LAB_INFUSIONS (make.js), with a surprise now and then.
import { installDom } from './dom-stub.js';
installDom();

const { STYLE_MOODS, MOOD_PAIRS } = await import('../tools/lib/banger/moods.js');
const { BANGER_MOODS, styleDefaults } = await import('../tools/lib/banger/options.js');
const { BANGER_STYLES } = await import('../tools/lib/banger/styles/index.js');
const { MAKER_STYLES, labSuitedMoods, LAB_INFUSIONS, familyOf } = await import('../src/game/banger/make.js');
const { BangerMakerState } = await import('../src/game/banger/maker.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const moodIds = new Set(BANGER_MOODS.map((m) => m.id));

{
  const missing = BANGER_STYLES.filter((s) => !STYLE_MOODS[s.id]).map((s) => s.id);
  assert(!missing.length, `every style has its suited moods${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  const unknown = Object.entries(STYLE_MOODS).flatMap(([id, list]) => [...(BANGER_STYLES.some((s) => s.id === id) ? [] : [id]),
    ...list.filter((m) => !moodIds.has(m)).map((m) => `${id}.${m}`)]);
  assert(!unknown.length, `every entry names a real style and real moods${unknown.length ? ` (${unknown.join(', ')})` : ''}`);
  const ownOff = BANGER_STYLES.filter((s) => STYLE_MOODS[s.id] && STYLE_MOODS[s.id][0] !== styleDefaults(s).mood).map((s) => s.id);
  assert(!ownOff.length, `each style's own mood comes first${ownOff.length ? ` (${ownOff.join(', ')})` : ''}`);
  const nowhere = [...moodIds].filter((m) => !Object.values(STYLE_MOODS).some((l) => l.includes(m)));
  assert(!nowhere.length, `every mood suits some style${nowhere.length ? ` (${nowhere.join(', ')})` : ''}`);
}

{
  assert(labSuitedMoods('techno').join() === STYLE_MOODS.techno.join(), 'without an infusion, FORMULA\'s own list');
  const both = labSuitedMoods('techno', 'acid-house');
  assert(both.length && both.every((m) => STYLE_MOODS.techno.includes(m) && STYLE_MOODS['acid-house'].includes(m)), 'with an infusion, the moods both suit');
  assert(labSuitedMoods('techno', 'shibuya').join() === STYLE_MOODS.shibuya.join(), 'sharing none, the infusion\'s own');
}

{
  const m = new BangerMakerState({ onDone: () => {}, onMade: () => {} });
  let ok = true;
  for (const s of MAKER_STYLES) {
    m.style = s.id; m.infusion = null;
    const items = m.moodItems();
    const want = new Set(STYLE_MOODS[s.id]);
    const bad = items.filter((it) => !!it.suits !== (MOOD_PAIRS[it.id]
      ? want.has(MOOD_PAIRS[it.id].first) && want.has(MOOD_PAIRS[it.id].second) : want.has(it.id)));
    if (bad.length) { ok = false; console.error('  ', s.id, bad.map((it) => it.id)); }
  }
  assert(ok, 'ELEMENT outlines exactly the suited moods, and a pair when both its moods suit');
  m.style = 'big-room'; m.infusion = null;
  assert(m.moodItems().some((it) => it.pair && it.suits), 'a pair can be recommended (Victory in Big Room)');
  m.style = 'techno'; m.infusion = 'acid-house';
  assert(m.moodItems().filter((it) => it.suits && !it.pair).map((it) => it.id).sort().join() === labSuitedMoods('techno', 'acid-house').sort().join(),
    'with an infusion ELEMENT outlines the moods both suit');
}

{
  // EXPERIMENT leans to the outlined moods: three in four, give or take, over many presses
  const m = new BangerMakerState({ onDone: () => {}, onMade: () => {} });
  let suited = 0, same = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const before = m.mood;
    m.experiment();
    if (m.mood === before) same++;
    if (m.moodItems().find((it) => it.id === m.mood)?.suits) suited++;
  }
  assert(same === 0, 'EXPERIMENT never keeps the ELEMENT on show');
  assert(suited / N > 0.7 && suited / N < 0.9, `EXPERIMENT lands on a recommended ELEMENT most of the time (${(100 * suited / N).toFixed(0)}%)`);
}

{
  // LAB_INFUSIONS (make.js): what EXPERIMENT leans to infuse each formula with
  const lab = new Set(MAKER_STYLES.map((s) => s.id));
  const missing = [...lab].filter((id) => !LAB_INFUSIONS[id]?.length);
  assert(!missing.length, `every Lab formula has recommended infusions${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  const bad = Object.entries(LAB_INFUSIONS).flatMap(([g, list]) => list.filter((id) => !lab.has(id) || id === g
    || familyOf(id) === familyOf(g) || labSuitedMoods(g, id).length < 2).map((id) => `${g}+${id}`));
  assert(!bad.length, `each is another Lab formula, from another family, sharing two or more moods${bad.length ? ` (${bad.join(', ')})` : ''}`);
  const m = new BangerMakerState({ onDone: () => {}, onMade: () => {} });
  let infused = 0, picked = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    m.experiment();
    if (!m.infusion) continue;
    infused++;
    if (LAB_INFUSIONS[m.style].includes(m.infusion)) picked++;
    if (m.infusion === m.style) { assert(false, 'EXPERIMENT never infuses a formula with itself'); break; }
  }
  const pct = (n) => (100 * n / N).toFixed(0);
  const none = (N - infused) / N, rec = picked / N, surprise = (infused - picked) / N;
  assert(Math.abs(none - 0.35) < 0.04 && Math.abs(rec - 0.55) < 0.04 && Math.abs(surprise - 0.10) < 0.03,
    `EXPERIMENT's infusion: NONE ${pct(N - infused)}%, recommended ${pct(picked)}%, a surprise ${pct(infused - picked)}% (35 / 55 / 10)`);
}

if (failed) process.exit(1);
console.log('lab-mood-suits: all ok');
