// GROUP BUSES ON THE DESK — the wiring, read off the source.
//
// The desk is a 20,000-line page that needs a browser and a live song to drive, and the
// group buses touch it in a dozen places that are each one line: a branch in a switch
// over strip kinds, a set that solo has to clear, a field a paste must not carry. Each of
// those is the kind of line that goes missing in a refactor and is only noticed when
// something sounds wrong, so they are pinned here the way tests/mixer-layout.js pins the
// rest of the desk. What the groups SOUND like is tests/group-buses.js.
import { readFileSync } from 'node:fs';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const entry = read('tools/mixer-entry.js');
const shell = read('tools/mixer-shell.html');
const editors = read('tools/mixer-note-fx-editors.js');
const fnBody = (name) => {
  const at = entry.indexOf(`function ${name}(`);
  return at < 0 ? '' : entry.slice(at, entry.indexOf('\n}\n', at) + 2);
};

// The selector, and the menu it opens.
assert(/btnRow\(routeButton\(key\), \.\.\.muteSoloPair\(key, lane\.label\)\)/.test(entry),
  'every channel strip carries the group button beside M and S');
assert(/b\.textContent = g \? String\(g\.index\) : '—'/.test(fnBody('routeButton'))
  && /setAttribute\('aria-label', label\)/.test(fnBody('routeButton')),
  'it shows the group number or a dash, and says so to a screen reader');
assert(/\.\.\.GROUP_BUSES\.map\(\(g\) => \(\{/.test(fnBody('openRouteMenu'))
  && /Assign Every Track by Family/.test(fnBody('openRouteMenu'))
  && /Clear Every Assignment/.test(fnBody('openRouteMenu')),
  'its menu is built from the four groups, with assign-by-family and clear-all under them');
assert(/\.ctlbtns button\.routebtn\.on \{[^}]*font-weight: 800/.test(shell),
  'an assigned button is filled and bold, so the state reads without the colour');

// One undo step each, and the engine moved live.
for (const fn of ['setLaneRoute', 'assignRoutesByFamily', 'clearAllRoutes']) {
  const body = fnBody(fn);
  assert((body.match(/editMix\(/g) || []).length === 1 && /routeLive\(/.test(body),
    `${fn} is one edit — one undo step — and re-points the engine`);
}
assert(/const seconds = playing \? 0\.02 : 0;/.test(fnBody('routeLive')),
  'a track moved while the song plays is cross-faded; a stopped desk moves it outright');

// Paste and reset leave a channel where it is routed.
assert(/const route = m\.lanes\[key\]\?\.group;[\s\S]*?if \(route\) m\.lanes\[key\]\.group = route; else delete m\.lanes\[key\]\.group;/.test(fnBody('pasteStrip')),
  'pasting a channel keeps the target\'s own group, not the copied one\'s');
assert(/const route = m\.lanes\[key\]\?\.group;\s*delete m\.lanes\[key\];\s*if \(route\) m\.lanes\[key\] = \{ group: route \};/.test(fnBody('resetTarget'))
  && /else if \(isGroupKey\(key\)\) \{ if \(m\.groups\) delete m\.groups\[groupIdOf\(key\)\]; \}/.test(fnBody('resetTarget')),
  'resetting a channel keeps its group; resetting a group keeps its members');

// A group key is never mistaken for a lane on the way to the mix or the engine.
const store = fnBody('storeEffects');
assert(store.indexOf('isGroupKey(key)') > 0 && store.indexOf('isGroupKey(key)') < store.indexOf('laneOf(m, key)'),
  'a group\'s effect chain is stored in `groups`, before the lane fallback could write it as a lane');
for (const fn of ['effectsOf', 'liveChain', 'bypassOn', 'muteOn', 'targetLabel', 'setEffects']) {
  assert(/isGroupKey\(key\)/.test(fnBody(fn)), `${fn} has a branch for a group bus`);
}

// The strips, the solo and the rack.
const rack = fnBody('buildRack');
assert(rack.indexOf('groupStrip(def, mix, slotRows)') > 0
  && rack.indexOf('groupStrip(def, mix, slotRows)') < rack.indexOf('sendStrip(def, mix, slotRows)'),
  'the groups with tracks in them sit in the bus slot, before the returns');
assert(/stripMenu\(el, key, 'group'\)/.test(fnBody('groupStrip')) && !/sendrow|SEND/.test(fnBody('groupStrip')),
  'a group strip has the strip menu and no sends');
assert(/soloedGroups/.test(fnBody('dropSolo')) && /soloedGroups/.test(fnBody('reapplySolo'))
  && /soloedGroups/.test(fnBody('updateSoloLight')),
  'group solo is cleared, re-applied after a mix reload, and lights the solo light');
assert(/byGroup/.test(fnBody('syncLaneButtons')) && /button\.mutebtn\.bygroup/.test(shell),
  'a track muted by its group shows it without lighting its own saved mute');

// The arrangement: a row per group, and nothing a track's bars can be dropped on.
assert(/for \(const g of activeGroups\(\)\) grid\.append\(groupRow\(g, plan\.length\)\);/.test(fnBody('buildArrangement'))
  && !/arrCells\.push/.test(fnBody('groupRow')),
  'each group with tracks gets an arrangement row, kept out of the tracks\' bar navigation');
assert(/el\.dataset\.route = g\.id;/.test(fnBody('groupRow')) && !/dataset\.group\b/.test(fnBody('groupRow')),
  'a group row names its group in data-route, never in data-group (which is a track\'s family)');
assert(/if \(isGroupKey\(row\?\.dataset\.lane\)\) return null;/.test(entry),
  'bars cannot be moved or copied onto a group\'s row');
assert(/openBarEffectsEditor\(x, y, key, \{ from: r\.from, to: r\.to \}\)/.test(fnBody('groupBarMenu'))
  && /actionSection\(`\$\{g\.name\} in \$\{scopeName\}`/.test(entry),
  'a group\'s Spot FX open from its row and from the timeline, beside the master\'s');
assert(/const bus = master \|\| !!group;/.test(editors) && /\(bus \? null : draft\.plan/.test(editors),
  'the Spot FX window treats a group like the master: no per-bar snapshots to fall back on');

// Undo repaints what the routing draws.
assert(/routeSig\(\) !== routesBefore\) buildArrangement\(\);/.test(fnBody('undo')),
  'undoing a routing change repaints the arrangement\'s group rows');

if (failed) { console.error('GROUP BUSES DESK: FAILED'); process.exit(1); }
console.log('GROUP BUSES DESK: PASSED');
