// The mixer has two adjustable vertical boundaries: the arrangement splitter and
// the new boundary between the channel rack and the effects shelf. Keep the live
// page contract in a small source test so a future shell edit cannot leave the
// handle unrendered, uncounted by the layout math, or detached from its drag code.
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../tools/mixer-shell.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
const seq = readFileSync(new URL('../tools/mixer-step-seq.js', import.meta.url), 'utf8');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const rack = shell.indexOf('<div id="rackwrap">');
const split = shell.indexOf('<div id="devsplit"');
const devices = shell.indexOf('<div id="devices">');
assert(rack >= 0 && split > rack && devices > split,
  'effects splitter sits between the mixer rack and effects panel');
assert(/#devsplit \{[^}]*cursor:\s*ns-resize[^}]*touch-action:\s*none/s.test(shell)
  && shell.includes('#devsplit.hidden { display: none; }'),
  'effects splitter has a touch-safe resize cursor and fold state');
assert(/id="devsplit"[^>]*role="separator"[^>]*aria-orientation="horizontal"/.test(shell),
  'effects splitter exposes a horizontal separator role');

assert(entry.includes("const DEV_KEY = 'mash-mixer-devh'")
  && entry.includes('localStorage.setItem(DEV_KEY')
  && entry.includes('localStorage.removeItem(DEV_KEY'),
  'effects height is remembered and resettable');
assert(entry.includes("const bar = $('devsplit')")
  && entry.includes("bar.addEventListener('pointerdown'")
  && entry.includes("bar.addEventListener('pointermove'")
  && entry.includes("bar.addEventListener('dblclick'"),
  'effects splitter handles drag and automatic-fit gestures');
assert(/function deviceRoom\([\s\S]*?h\(\$\('devsplit'\)\)/.test(entry),
  'layout calculations reserve the effects splitter');
assert(entry.includes('function syncDeskSplitter()')
  && /function setDevicesFolded[\s\S]*?syncDeskSplitter\(\)/.test(entry)
  && /function setMixerFolded[\s\S]*?syncDeskSplitter\(\)/.test(entry)
  && /function setArrangeCollapsed[\s\S]*?syncDeskSplitter\(\)/.test(entry),
  'the handle hides when either adjacent panel is folded');
assert(/function syncDeskSplitter\(\)[\s\S]*?\$\('arrsplit'\)\.classList\.toggle\('hidden'[\s\S]*?\$\('devsplit'\)\.classList\.toggle\('hidden'/.test(entry)
  && !/\$\('arrsplit'\)\.classList\.toggle\('hidden', on\)/.test(entry),
  'both handles are governed together, so neither outlives the panels it borders');

// ---- the desk column: a pinned footer and one elastic region ---------------------
// The footer used to travel. #rackwrap was the only flex:1 child of the page column
// and folding the mixer is display:none, so with nothing elastic left the column
// stacked from the top and the footer floated into the middle of the screen. The fix
// is structural: the four resizable regions live in #desk, the footer is outside it,
// and which region is elastic is a class the desk sets on every fit.
const deskAt = shell.indexOf('<main id="desk">');
const deskEnd = shell.indexOf('</main>');
const footerAt = shell.indexOf('<footer>');
assert(deskAt > 0 && deskEnd > deskAt && footerAt > deskEnd,
  'the resizable regions are inside #desk and the footer is structurally after it');
assert(shell.indexOf('<div id="arrange">') > deskAt
  && shell.indexOf('<div id="rackwrap">') < deskEnd
  && shell.indexOf('<div id="devices">') < deskEnd
  && shell.indexOf('<div id="deskslack"') < deskEnd
  && shell.indexOf('<div id="timeline"') < deskAt,
  'arrangement, rack, effects and the slack band divide the desk; the timeline does not');
assert(/#desk \{[^}]*flex: 1 1 auto[^}]*min-height: 0[^}]*flex-direction: column[^}]*overflow: hidden/s.test(shell),
  '#desk takes the window, can be squeezed below its content, and clips itself first');
assert(/#desk > \.greedy \{[^}]*flex: 1 1 auto[^}]*min-height: 0/s.test(shell)
  && !/#rackwrap \{[^}]*flex: 1/s.test(shell),
  'the elastic region is chosen by a class rather than hardwired to the rack');
assert(shell.includes('#deskslack { display: none; }')
  && /#deskslack\.greedy \{[^}]*background: var\(--panel\)/s.test(shell),
  'the empty band is desk-coloured and exists only while it is the elastic one');
assert(entry.includes("const DESK_CHAIN = ['rackwrap', 'arrange', 'devices', 'deskslack']")
  && entry.includes('function applyDeskChain()')
  && /function fitStrips\(\) \{\s*applyDeskChain\(\)/.test(entry),
  'the priority chain is written down once, in order, and re-run on every fit');
// The arrangement is snapped to whole lanes, so it can never be the flex:1 one — and
// what it cannot use has to pass DOWN the chain rather than stopping at the band. It
// used to stop there, which boxed the piano roll into its own content height with a
// slab of dead desk under it whenever the mixer was folded.
assert(/DESK_CHAIN\s*\.filter\(\(id\) => id !== 'arrange'\)\s*\.find\(/.test(entry),
  'the arrangement takes lanes, not slack, and passes the rest to the effects panel');
assert(/#desk\.cramped \{[^}]*overflow-y: auto/s.test(shell)
  && /classList\.toggle\('cramped', cramped\)/.test(entry),
  'a window too short for every minimum scrolls the desk — the footer is never clipped');
assert(/footer \{[^}]*margin-top: auto/s.test(shell)
  && /#err \{[^}]*max-height: 30vh[^}]*overflow: auto/s.test(shell),
  'the footer cannot float even if the chain fails, and a stack trace cannot eat the desk');

// ---- one minimum table, not six constants in five functions ----------------------
assert(/const MIN = \{[\s\S]*?timeline:[\s\S]*?arrange:[\s\S]*?mixer:[\s\S]*?devices:[\s\S]*?\};/.test(entry)
  && /const WANT = \{[\s\S]*?arrange:[\s\S]*?devices:[\s\S]*?\};/.test(entry)
  && !entry.includes('Math.max(140,')
  && !entry.includes('function arrangementFloor')
  && !entry.includes('function capDevices'),
  'every per-panel minimum lives in one table; the 140px floor and the eight-lane "floor" are gone');
assert(entry.includes('const deskPool = () => innerHeight')
  && !entry.includes('const pageChrome')
  && !/const deskPool[\s\S]{0,300}?\$\('devices'\)/.test(entry),
  'the pool is the window less the four things outside the desk — the effects panel is not chrome');

// ---- a handle moves only the two panels it borders -------------------------------
// deviceRoom() used to subtract a hypothetical one-lane arrangement while fitStrips
// measured the ceiling against the effects panel's live height. Two different worlds,
// and the reason dragging the effects handle shrank the arrangement instead.
assert(/function rackFloor\(\) \{ return bareChrome\(\) \+ FADER_FLOOR \+ rackPad\(\); \}/.test(entry)
  && /function deviceRoom\([\s\S]*?MIN\.mixer\(\)/.test(entry)
  && !/function deviceRoom\([^]*?\n\}/.exec(entry)[0].includes('FADER_MIN')
  && !/function deviceRoom\([^]*?\n\}/.exec(entry)[0].includes('laneRowHeight()'),
  'the effects handle clamps against the rack floor alone and cannot reach the arrangement');
assert(/function planDesk[\s\S]*?let rackH = room - arrH - devH/.test(entry),
  'the arrangement and the effects panel are sized independently and the rack takes the difference');

// ---- the shrink ladder ------------------------------------------------------------
// A short window sheds whole BLOCKS, in one fixed order, and says on the header switch
// that it has. It never scrolls a strip body: the old floor reserved a whole
// uncompressed strip precisely because .stripbody scrolls with no scrollbar, so a row
// that went out of sight went without saying so.
assert(entry.includes("const SHED_ORDER = ['effects', 'sends', 'eq']")
  && /const shedClass = \(id\) => STRIP_PARTS\.find\(\(p\) => p\.id === id\)\.cls\.replace\('no-', 'shed-'\)/.test(entry),
  'the ladder sheds inserts, then sends, then EQ — named once, in the switches own ids');
assert(/#rackwrap\.no-eq \.eqrow,\s*#rackwrap\.shed-eq \.eqrow,\s*#rackwrap\.no-sends \.sendrow,\s*#rackwrap\.shed-sends \.sendrow,\s*#rackwrap\.no-fx \.fxbtns,\s*#rackwrap\.shed-fx \.fxbtns \{ display: none; \}/.test(shell),
  'shed-* hides exactly what no-* hides, as a separate set of classes');
assert(!/#rackwrap\.(squeezed|compact)|\.stripsum/.test(shell)
  && !/compactStripHeight|summaryChip|paintSummary|openFullStrips|classList\.(add|toggle)\('(compact|squeezed)'/.test(entry),
  'nothing scrolls and no summary chip: a shed block is hidden outright, not squeezed');
assert(/classList\.toggle\(shedClass\(id\), gone\.includes\(id\)\)/.test(entry)
  && !/\.strip\.shed-/.test(shell),
  'the rung is a state of the whole rack, so every fader in it stays on one line');
// The affordance the whole ladder rests on: it may hide a block because it says so.
assert(entry.includes('function markShedParts(gone)')
  && /b\.classList\.toggle\('shed', shed\)/.test(entry)
  && /#partfilter button\.shed \.lbl \{ text-decoration: line-through; \}/.test(shell)
  && /b\.dataset\.part = p\.id/.test(entry),
  'a block the desk hid is struck through on its own switch, distinct from one you turned off');
// Two fader numbers, not one. With only the comfortable minimum to bargain with, the
// ladder shed two blocks to save five pixels and handed the freed height to the fader.
assert(entry.includes('const FADER_MIN = 48')
  && entry.includes('const FADER_FLOOR = 34')
  && /while \(shed < SHED_ORDER\.length && strips < stripChromeAt\(shed\) \+ FADER_FLOOR\) shed\+\+/.test(entry)
  && /const fader = Math\.max\(FADER_FLOOR, strips - chrome\)/.test(entry)
  // The applied floor and the one the shed loop bargains with have to be the SAME
  // number, or a strip is handed more content than height and its body scrolls.
  && /rackWant = [\s\S]{0,400}?chrome \+ FADER_MIN \+ rackPad\(\)/.test(entry),
  'the fader compresses past its comfortable minimum to keep one more block on screen');
// Every number the ladder is steered by is measured at a NAMED rung rather than at
// whichever one the rack is standing on, or the fit becomes a function of its own last
// answer — a latch, where a short window once meant a short window forever.
const atShedFn = /function atShed\(n, fn\)[^]*?\n\}/.exec(entry)?.[0] || '';
assert(atShedFn.includes('wrap.classList.remove(...SHED_ORDER.map(shedClass))')
  && atShedFn.includes("wrap.classList.add(...SHED_ORDER.slice(0, n).map(shedClass), 'measuring')")
  && atShedFn.includes("wrap.style.setProperty('--faderh'")
  && atShedFn.includes('finally'),
  'measurements name the rung they want and always put the real one back');
assert(/function measureChromeAt\(n\) \{\s*return atShed\(n,/.test(entry)
  && /chromeRungs = SHED_ORDER\.map\(\(_, i\) => measureChromeAt\(i\)\)/.test(entry)
  && /function rackFloor\(\) \{ return bareChrome\(\) \+ FADER_FLOOR \+ rackPad\(\); \}/.test(entry)
  && shell.includes('#rackwrap.measuring .voicepair { height: auto; }'),
  'one chrome height per rung, measured off the ladder, and the floor is the last of them');
// A block hidden by hand has no height left for the ladder to save by hiding it again.
assert(/function applyStripParts\(\)[\s\S]*?forgetStripMetrics\(\)/.test(entry)
  && /function buildRack\(\)[\s\S]*?forgetStripMetrics\(\)/.test(entry),
  'the cached rungs are dropped when a part switch or a rack rebuild moves them')

const arrangeHead = shell.indexOf('<div id="arrhead">');
const addTrack = shell.indexOf('id="addtrackbtn"');
assert(arrangeHead >= 0 && addTrack > arrangeHead
  && shell.slice(arrangeHead, addTrack).includes('Arrangement'),
  'the Add Track plus lives in the Arrangement header');
assert(/#arrhead \{[^}]*position:\s*relative/s.test(shell)
  && /#arrhead #addtrackbtn \{[^}]*left:\s*calc\(var\(--arrname\) \+ var\(--gut\) \+ var\(--namegap\) - 24px\)[^}]*transform:\s*translateY\(-50%\)/s.test(shell)
  && /#addtrackbtn \{[^}]*color:\s*var\(--ctl-hi\)[^}]*font:\s*400 19px\/1/s.test(shell),
  'Add Track is right-aligned immediately before the arrangement bars');
assert(/#addtrackbtn \{[^}]*color:\s*var\(--ctl-hi\)[^}]*font:\s*400 19px\/1/s.test(shell)
  && !shell.slice(0, addTrack).includes('class="addtrackicon"'),
  'Add Track is a light theme-coloured plus rather than a heavy icon button');
assert(/\$\('addtrackbtn'\)\.onclick[\s\S]*?addPercussionLane\(\)/.test(entry)
  && !entry.includes('openAddTrackPicker'),
  'the plus opens one new track and its preset selector without a choice menu');
assert(/function openVoicePicker[\s\S]*?className = 'voiceclose popclose'[\s\S]*?closeMenu\(\)/.test(entry)
  && /#voicepicker button\.voiceclose \{[^}]*width:\s*34px[^}]*height:\s*34px[^}]*font-size:\s*23px/s.test(shell),
  'the preset selector has the large preset-editor close button');
assert(/id="font"[^>]*>[\s\S]*?<\/select>\s*<\/label>\s*<label[^>]*>\s*<span>Theme<\/span>\s*<select id="theme"/s.test(shell),
  'the colour theme selector sits beside the font selector in Desk settings');
assert(entry.includes("const THEME_KEY = 'mash-mixer-theme'")
  && entry.includes('document.documentElement.dataset.mixerTheme')
  && entry.includes('localStorage.setItem(THEME_KEY'),
  'the selected mixer theme is applied to the document and remembered');
assert(shell.includes(':root[data-mixer-theme="light"]')
  && entry.includes("['light', 'Light Paper']"),
  'the theme list includes a light desk palette');
assert(shell.includes(':root[data-mixer-theme="midday"]')
  && entry.includes("['midday', 'Midday']")
  && entry.includes("['dawn', 'Dawn']")
  && entry.includes("['dusk', 'Dusk']"),
  'the theme list includes additional light and dark mixed palettes');
assert(shell.includes(':root[data-mixer-theme="oscar"]')
  && entry.includes("['oscar', 'Oscar']")
  && /data-mixer-theme="oscar"[\s\S]*?--accent: #f0a63a/.test(shell)
  && /data-mixer-theme="oscar"[\s\S]*?--ctl: #bdb6a6/.test(shell)
  && /oscar: \['#b8a89a'/.test(entry),
  'Oscar is a monochrome hardware palette: cream knobs, an amber ON lamp, unlit legends');
assert(!entry.includes('midday: [')
  && /data-mixer-theme="midday"[\s\S]*?--accent: #4ec9b0/.test(shell),
  'Midday keeps Midnight\'s bright track colour path and signal accents');
assert(/data-mixer-theme="midday"[\s\S]*?--selected-ink: #27323a[\s\S]*?--lane-ink: #1e3035/.test(shell)
  && shell.includes('.arrrow.sel .arrname { color: var(--selected-ink)')
  && shell.includes('.strip.selected h3 { color: var(--selected-ink)'),
  'Midday uses dark text for selected tracks and lane labels on its light surfaces');
assert(entry.includes('const TRACK_PALETTES = {')
  && entry.includes('themeTrackColour')
  && entry.includes('arrangementBarColour')
  && entry.includes('refreshThemeColours'),
  'alternate themes use finite track palettes and refresh shared track views');

// ---- the theme ramp ---------------------------------------------------------------
// The desk used to carry about two hundred hardcoded slate hexes, which is why every
// theme but Midnight kept a black toolbar, lost its grid lines and stayed teal in a
// hundred small places. Everything below is the shape that stops that coming back.
const css = shell.slice(shell.indexOf('<style>'), shell.indexOf('</style>'));
const rules = css.slice(css.indexOf('* { box-sizing: border-box; }')).replace(/\/\*[\s\S]*?\*\//g, '');
for (const v of ['--tray', '--traybtn', '--well', '--deep', '--seam', '--line2',
                 '--grid', '--faint', '--faintest', '--accent-line', '--on-accent']) {
  assert(new RegExp(`\\n\\s*${v}:`).test(css) && rules.includes(`var(${v})`),
    `${v} is defined once on the ramp and used by the rules`);
}
assert(/--on-accent: #eafaf5/.test(shell),
  'Light Paper writes a light ink on its dark accent rather than Midnight\'s dark one');
// The chrome that was black on every light desk, and the ticks that were invisible.
assert(/\.transport \{[^}]*background: var\(--tray\)/s.test(rules)
  && /\.transport button \{[^}]*background: var\(--traybtn\)/s.test(rules)
  && /#ruler \.tick \{[^}]*background: var\(--grid\)/s.test(rules)
  && rules.includes('.arrcell.barstart { box-shadow: inset 1px 0 0 var(--grid); }'),
  'the transport tray and the bar ticks take their colour from the theme');
// A cast shadow the width of the desk, from a drawer that is shut.
assert(!/#navdrawer \{[^}]*box-shadow/s.test(rules)
  && /#navdrawer\.show \{[^}]*box-shadow/s.test(rules),
  'the drawer casts a shadow only while it is open');
// What is left is deliberate and should stay small. Three things are allowed to be a
// fixed colour: the two keyboards, because a piano is black and white whatever the
// desk is; the moulded fader cap, because it is a physical object rather than a
// surface; and the dark ink on the mute and section badges, which is legible on a
// saturated fill in any theme. Anything beyond that is a theme hardcoded again.
const strayHexes = (rules.match(/#[0-9a-fA-F]{6}\b/g) || []).length;
assert(strayHexes <= 42, `the rules carry ${strayHexes} literal hexes; only the keyboards, the fader cap and the badge inks should be fixed`);
assert(!/hsl\(\$\{laneHue\(key\)\} 3[02]% 1[25]%\)/.test(entry)
  && entry.includes('let panelIsLight = false')
  && /const barMix = \(shade\)[\s\S]*?panelIsLight/.test(entry),
  'lane tints mix toward the surface instead of assuming Midnight\'s dark one');
assert(/colour: hueColour\(hue\), tint: hueTint\(hue\)/.test(entry),
  'the send returns take the theme\'s palette rather than a raw teal and purple');
const addTrackFn = entry.match(/function addPercussionLane\(anchor = null\) \{[\s\S]*?\n\}/)?.[0] || '';
assert(/pendingAddTrack = \{[\s\S]*?openVoicePicker\(x, y, newKey\)/.test(addTrackFn)
  && !addTrackFn.includes('editMix(')
  && /function commitPendingAddTrack[\s\S]*?m\.layers[\s\S]*?m\.lanes\[pending\.key\][\s\S]*?voice\[seam\.voiceKey\]/.test(entry)
  && /const pick = \(id\)[\s\S]*?commitPendingAddTrack\(laneKey, id\)[\s\S]*?closeMenu\(\)/.test(entry),
  'Add Track waits for a preset before creating the independent lane');
assert(/\$\('addtrackbtn'\)\.onclick[\s\S]*?addPercussionLane\(ev\.currentTarget\)/.test(entry)
  && /const plusRect = anchor\?\.getBoundingClientRect/.test(entry),
  'the new-track preset selector opens beside the Arrangement plus');
assert(/const isIndependentLane = \(key\)[\s\S]*?const layer = isLayer\(laneKey\) && !independent/.test(entry)
  && /A duplicate of \$\{targetLabel\(baseLane\(laneKey\)\)\}/.test(entry),
  'independent tracks are not presented as duplicates of Tom in the voice picker');
assert(/function openVoicePicker[\s\S]*?const pending = pendingAddTrack\?\.key === laneKey[\s\S]*?let kind = pending \? 'all'[\s\S]*?else if \(pending\)[\s\S]*?Choose a preset for this new track/.test(entry),
  'the plus picker starts on All without presenting the Tom engine default');
assert(/async function deleteLane[\s\S]*?bankCache\.sig = null;[\s\S]*?localStorage\.removeItem\(LANE_KEY\)[\s\S]*?rebuildForShape\(\)/.test(entry)
  // Two words on the button, the track named in the confirmation — which is the step you
  // cannot take back and the only place the name has to be right.
  && /label: 'Delete Track', danger: true,[\s\S]*?run: \(\) => deleteLane\(laneKey\)/.test(entry)
  && /ask\(`Delete \$\{number \? `track \$\{number\}, ` : ''\}\$\{escapeHtml\(label\)\}\?`/.test(entry)
  && /The other tracks and all song bars stay in place/.test(entry)
  && /function rebuildForShape\(\) \{[\s\S]*?bankCache = \{ bank: null, sig: null, out: null \};[\s\S]*?buildRack\(\);[\s\S]*?buildArrangement\(\);[\s\S]*?rebank\(\)/.test(entry)
  && /const mixRemoved = layer[\s\S]*?\.arrrow\[data-lane=[\s\S]*?\.strip\[data-lane=/.test(entry),
  'deleting a track invalidates its shaped view, clears selection, and lives on the track menu');
// `drop` is a Set, and this is the first thing deleteLane does with it. Handing a Set
// to something expecting an array threw before a single line of the delete had run:
// no mix edit, no repaint, and a strip that stayed exactly where it was.
assert(/removeLanes\(currentArrangement, \[\.\.\.drop\]\)/.test(entry),
  'the arrangement clean-up is handed the dropped lanes as an array, not the raw Set');
// One right-click, one scope. The bar panel edits the bars it was opened on and
// cannot remove the track or reach across the song; the switch that used to let it
// is gone, along with the labels that had to keep explaining which mode was on.
const regionFn = entry.match(/\nfunction openRegionEditor\([\s\S]*?\n\}\n/)?.[0] || '';
const barBranch = regionFn.match(/\} else if \(!wholeTrack\) \{[\s\S]*?\n  \} else if \(wholeTrack\) \{/)?.[0] || '';
const trackBranch = regionFn.match(/\} else if \(wholeTrack\) \{[\s\S]*?\n  \}\n/)?.[0] || '';
assert(regionFn && barBranch && trackBranch
  // Same verb as the track panel, scoped to these bars — and it EMPTIES them. Forked
  // rather than shared: clearing bar 3 must not empty the other bars of its pattern.
  && /label: 'Erase Notes', danger: true,[\s\S]*?clearLaneBars\(laneKey, from, to, `\$\{laneLabel\} erased in \$\{span\.toLowerCase\(\)\}`\)/.test(barBranch)
  && /label: 'Copy Notes'[\s\S]*?label: 'Paste Notes'/.test(barBranch)
  && !/'Delete here'|'Restore here'|'Clear'|setLanesDeleted\([^)]*true\)/.test(barBranch)
  // Edit notes… is gone from BOTH panels: two buttons, two keys, and a double-click on
  // the bar itself already open the editor on the channel the right-click selected.
  && !/label: 'Edit notes…'/.test(regionFn)
  && /box\.ondblclick = \(\) => openNoteEditor\(row\.key, bar\)/.test(entry)
  && !/deleteLane|duplicateLane|Change preset|Reset channel/.test(barBranch)
  && !/regscope/.test(entry) && !/regscope/.test(shell)
  && !/textContent = 'Entire track'/.test(entry)
  && !/Selected bars? \$\{/.test(entry),
'the bar panel is scoped to the bars it was opened on, with no scope switch, no track removal and no channel actions');
// Tracks do track things, channels do channel things, and WHERE you right-clicked is what
// decides which — the arrangement row is the track, the mixer strip is its signal path.
// Both used to open the track panel, which put one set of buttons behind two gestures and
// made the result of a right-click unguessable from the thing under the pointer.
assert(/function openTrackEditor\(x, y, key\) \{\s*openRegionEditor\(x, y, \{ laneKey: key, from: 0, to: 0, wholeTrack: true \}\)/.test(entry)
  && /function trackMenu\(el, key\)[\s\S]*?openTrackEditor\(ev\.clientX, ev\.clientY, key\)/.test(entry)
  && /trackMenu\(header, row\.key\)/.test(entry)
  && !/openTrackEditor/.test(entry.slice(entry.indexOf('function stripMenu'),
    entry.indexOf('function trackMenu')))
  && !entry.includes('trackMenuItems')
  && !/label: 'Adjust entire track…'/.test(entry),
'the arrangement row opens the track panel and the strip no longer does');
// The strip gets what the master and the sends have always had: five items about the
// signal path, built by the one function all three share.
assert(/function stripMenu\(el, key, kind\)[\s\S]*?label: `Copy \$\{Kind\}`[\s\S]*?label: `Reset \$\{Kind\}`/.test(entry)
  && /const Kind = kind\[0\]\.toUpperCase\(\) \+ kind\.slice\(1\)/.test(entry)
  && /stripMenu\(el, key, 'channel'\)/.test(entry)
  && /stripMenu\(el, key, 'send'\)/.test(entry)
  && /stripMenu\(el, '__master', 'master'\)/.test(entry),
'a channel strip gets the same channel menu as the master and the send returns');
assert(/actionSection\('Sound', \[[\s\S]*?label: 'Preset'[\s\S]*?openVoicePickerFor\(laneKey\)[\s\S]*?label: 'Edit Preset'[\s\S]*?editVoice\(laneKey\)/.test(trackBranch)
  && !/isNew: true/.test(trackBranch)
  && /label: 'Duplicate',\s*title: layersOf\(laneKey\)\.length/.test(trackBranch)
  // Clear EMPTIES the lane rather than flagging it: rests written into every bar, the
  // right rest for the lane's kind, and the delete flags taken off with them. A flag
  // left the notes in the file and in the roll, and Reset track undid the clear. Both
  // panels go through the one helper — shared here, forked in the bar panel.
  //
  // The note LENGTHS go with the notes, and the write says so explicitly: cleared bars
  // that kept their lengths would give the next note drawn on one of those steps the
  // length of whatever used to be there.
  && /label: 'Erase Notes'[\s\S]*?clearLaneBars\(laneKey, from, to, `\$\{laneLabel\} erased`, \{ shared: true \}\)/.test(trackBranch)
  && /function clearLaneBars\(laneKey, from, to, what, \{ shared = false \} = \{\}\) \{[\s\S]*?PERCUSSION_LANES\.includes\(baseLane\(laneKey\)\) \? false : null[\s\S]*?const write = shared \? writeBarNotesShared : writeBarNotes[\s\S]*?setLanesDeleted\(arrDraftOf\(\), from, to, \[laneKey\], false\)[\s\S]*?write\(eb, next, bar, laneKey, empty, noLengths\)/.test(entry)
  && !/setLanesDeleted\(arrDraftOf\(\), from, to, \[laneKey\], true\)/.test(entry)
  // No Channel section and no Edit notes…: the first belongs to the strip, the second has
  // a toolbar button and a key of its own. Mute and solo stay out for the older reason —
  // both views already carry those buttons, with their state showing.
  && !/actionSection\('Channel'/.test(trackBranch)
  && !/copyStrip|pasteStrip|pasteEffects|resetTarget/.test(trackBranch)
  // The item, not the word — the branch explains in a comment why it no longer has one.
  && !/label: 'Edit notes…'/.test(trackBranch)
  && !/setLaneMute|setLaneSolo/.test(trackBranch),
'the track panel carries the sound and the part, and nothing about the channel');
// ---- one vocabulary across all three panels --------------------------------------
//
// Every button in the three right-click panels is Title Case, and the destructive ones
// name the noun they act on. `Clear` / `Reset` / `Delete` were three words for "less
// than there was" whose difference you had to already know; `Erase Notes`, `Reset
// Adjustments` and `Delete Track` say it. The same verb means the same thing in the bar
// panel and the track panel — only the heading's scope differs.
const panelLabels = [...regionFn.matchAll(/label: (?:[\w?.\s]+\?\s*)?'([^']+)'(?:\s*:\s*'([^']+)')?/g)]
  .flatMap((m) => [m[1], m[2]]).filter(Boolean);
assert(panelLabels.length >= 12
  && panelLabels.every((label) => label.split(' ').every((word) => /^(?:[A-Z]|\d|from$|in$|to$)/.test(word))),
`every panel button is Title Case (${panelLabels.filter((l) => !l.split(' ').every((w) => /^(?:[A-Z]|\d|from$|in$|to$)/.test(w))).join(', ') || 'none stray'})`);
assert(!/label: '(?:Clear|Reset|Reset track|Delete)'/.test(regionFn)
  && panelLabels.includes('Erase Notes') && panelLabels.includes('Reset Edits')
  && panelLabels.includes('Delete Track') && panelLabels.includes('Delete Bars')
  && panelLabels.filter((l) => l === 'Erase Notes').length === 2
  && panelLabels.filter((l) => l === 'Copy Notes').length === 2,
'the destructive verbs name what they act on, and the notes verbs are shared by both lane panels');
// Timing and gain are per-track. Across every melodic track at once they are a no-op and
// the master fader respectively, so the timeline panel does not offer them.
assert(/if \(laneKey\) \{\s*addControl\(\{ field: 'offset'[\s\S]*?addControl\(\{ field: 'gain'/.test(entry)
  && /if \(!laneKey \|\| melodic\.includes\(laneKey\)\) \{\s*addControl\(\{ field: 'transpose'/.test(entry),
'the timeline adjusts transpose only; timing and gain belong to a single track');
// The title is the track, said the way the desk says it everywhere else, with no sub-line
// under it explaining what a panel headed `Track 3. Rim` could possibly be about.
assert(/heading\.textContent = laneKey[\s\S]*?wholeTrack \? `\$\{number \? `Track \$\{number\}\. ` : ''\}\$\{laneLabel\}`/.test(entry)
  && /if \(!\(laneKey && wholeTrack\)\) \{[\s\S]*?regtarget/.test(entry)
  && /section\(wholeTrack \? 'Adjust' : `Adjust \$\{laneLabel\}`\)/.test(entry),
'the track panel is titled by number and name, with the explanatory lines gone');
assert(/\.regfoot \{[^}]*position:\s*sticky[^}]*bottom:\s*0/s.test(shell)
  && /#regionedit \{[^}]*max-height:\s*calc\(100vh - 12px\)[^}]*overflow:\s*auto/s.test(shell),
  'the taller track panel scrolls with Apply and Cancel pinned to its bottom edge');
assert(/const nameInput = layer && wholeTrack/.test(entry)
  && /const wrap = section\('Track name'\)/.test(entry)
  && /nameChanged = !!next[\s\S]*?updateApply\(\)/.test(entry)
  && /if \(nameChanged && label\)[\s\S]*?m\.layers = \(m\.layers \|\| \[\]\)\.map[\s\S]*?applyArrangementEdit\(next[\s\S]*?undo: !nameChanged/.test(entry)
  && !/label: 'Rename track…'/.test(entry)
  && !/async function renameLane/.test(entry)
  && /customLayerLabel[\s\S]*?label: VOICES\[voiceId\]\.label/.test(entry),
  'the track panel names a desk-owned track at the top, and preserves it across preset changes');
assert(entry.includes("const SONG_LAYOUT_KEY = 'mash-mixer-song-layout'")
  && /function currentSongLayout\(\) \{[\s\S]*?keyboard:\s*oskShown\(\)[^}]*?view:\s*deskView[^}]*?grid:\s*stepSeq\.isOpen\(\)/.test(entry)
  && /function loadTrack\(id\)[\s\S]*?rememberSongLayout\(trackId\)[\s\S]*?restoreSongLayout\(id\)/.test(entry),
  'keyboard and both note editors are remembered as separate facts, and restored per song');
assert(/function showStepSeq\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showPianoRoll\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showOsk\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry),
  'opening and closing the keyboard or either note editor updates its song layout');

// The two note editors. They were one panel with two views and one button, which made
// them exclusive — you could not look at the kit and the bassline together. Three things
// keep them apart now and all three have to hold: the grid is a WINDOW outside #devices,
// each has its OWN button, and neither open path touches the other's panel.
const devicesEnd = shell.indexOf('<footer>', devices);
const stepseqAt = shell.indexOf('<div id="stepseq">');
assert(shell.indexOf('<div id="pianoroll">') > devices
  && shell.indexOf('<div id="pianoroll">') < devicesEnd
  && stepseqAt > devicesEnd,
  'the roll is a view inside the effects region and the step grid is not');
assert(/#stepseq \{[^}]*position:\s*fixed[^}]*z-index:\s*13/s.test(shell)
  && /#stepseq \.ssqhead \{[^}]*cursor:\s*grab/s.test(shell)
  // The property, not the word — the file explains in a comment why it does not pass one.
  && !/headerHost\s*:/.test(seq),
  'the step grid is a draggable window with a header of its own, not a hosted view');
// A window needs the desk's standard close, and this one wears `.popclose` — but an ID in
// front of a class beats a bare class, so the panel's own small-control rule was silently
// shrinking it back to the 11px × that `.popclose` exists to abolish. The `:not()` is what
// keeps them apart, and `.ssqx.ssqadd` is what stops the guard outranking the `+`.
assert(/createBarGrid[\s\S]*?shut\.className = 'ssqx popclose'/.test(
  readFileSync(new URL('../tools/mixer-bar-grid.js', import.meta.url), 'utf8')),
  'the window\'s close is the desk\'s shared one, not a mark of its own');
assert(/:is\(#stepseq,#pianoroll\) \.ssqx:not\(\.popclose\)/.test(shell)
  && !/:is\(#stepseq,#pianoroll\) \.ssqx \{/.test(shell)
  && /:is\(#stepseq,#pianoroll\) \.ssqx\.ssqadd \{[^}]*font-size:\s*17px/s.test(shell),
  'and the panel\'s small controls cannot shrink it, nor the guard shrink the +');
assert(/\$\('seqbtn'\)\.onclick = \(\) => showStepSeq\(!stepSeq\.isOpen\(\)\)/.test(entry)
  && /\$\('rollbtn'\)\.onclick = \(\) => showPianoRoll\(deskView !== 'notes'\)/.test(entry)
  && /function setDeskView[\s\S]*?pianoRoll\.open\(notes\)/.test(entry)
  && !/function setDeskView[\s\S]*?stepSeq\./.test(entry.slice(
    entry.indexOf('function setDeskView'), entry.indexOf('function showStepSeq'))),
  'one button each, and switching the region\'s view never opens or shuts the grid');
assert(/\$\('rollbtn'\)\.classList\.toggle\('on', notes\)/.test(entry),
  'the roll\'s toolbar light is set from the view, so it agrees with the Notes chip');

// The header's controls. They had grown five different heights and four different widths,
// which reads as a row that was never set. One variable governs the height of everything
// in it, and the icon-only buttons are square at that number — so a new button cannot
// quietly reintroduce a fifth size by carrying its own padding.
// The variable is on :root rather than on `header`: the panel folds down the left edge
// are the same square as the hamburger, and a header-scoped variable put them out of reach.
assert(/--ctlh: 30px; --ctlicon: 17px;/.test(shell)
  && /header button, header select \{ height: var\(--ctlh\)/.test(shell)
  && /header \.iconbtn \{ width: var\(--ctlh\); padding: 0;/s.test(shell)
  && /header \.iconbtn > svg \{ width: var\(--ctlicon\); height: var\(--ctlicon\); \}/.test(shell),
  'one control height across the header, with square icon buttons at that height');
// The fold column and the lane numbers under it take the same square, from the same
// variable — a hand-set 22 next to the menu's 30 is what put them off one another.
assert(/\.foldbtn \{ width: var\(--ctlh\); height: var\(--ctlh\);/.test(shell)
  && /\.arrnum \{ flex: none; width: var\(--ctlh\);/.test(shell),
  'the panel folds are the hamburger\'s square, and the lane numbers run down it');
const header = shell.slice(shell.indexOf('<header>'), shell.indexOf('</header>'));
const iconOnly = ['navbtn', 'playstart', 'stop', 'play', 'pause', 'clearsolo',
  'oskbtn', 'seqbtn', 'rollbtn', 'presetbtn'];
assert(iconOnly.every((id) => new RegExp(`id="${id}"[^>]*class="[^"]*\\biconbtn\\b`)
  .test(header) || new RegExp(`class="[^"]*\\biconbtn\\b[^"]*"[^>]*id="${id}"`).test(header)),
  'every icon-only header button wears the square box');
assert(!/\.transport button \{[^}]*(width|height):/s.test(shell)
  && !/#clearsolo \{[^}]*(width|height):/s.test(shell)
  && !/#presetbtn \{[^}]*(width|height):/s.test(shell)
  // `(?<!-)` so `stroke-width` on the hamburger is not read as a size.
  && !/\.(oskicon|seqicon|rollicon|preseticon|hamburger) \{[^}]*(?<!-)width:/s.test(shell),
  'and none of them sizes itself, so the row cannot drift apart again');

// The panel buttons are pictures, so the tooltip is the only place their NAME and their
// purpose are written down. Two ways for that to rot silently: a button loses its
// `data-tipsays` and falls back to a bare name, or one keeps a `title` as well and the OS
// draws a second, uglier tooltip on top a second later. Both are invisible in a diff.
for (const id of ['oskbtn', 'seqbtn', 'rollbtn', 'presetbtn', 'ab', 'undo']) {
  const tag = header.match(new RegExp(`<button id="${id}"[\\s\\S]*?>`))?.[0] || '';
  assert(/\bdata-tip="[^"]+"/.test(tag) && /\bdata-tipsays="[^"]{40,}"/.test(tag)
    && !/\btitle=/.test(tag),
    `${id} explains itself in the tooltip, and carries no second one from the browser`);
}
assert(/data-tipkey="G"/.test(header) && /data-tipkey="N"/.test(header)
  && /data-tipkey="⌘Z"/.test(header),
  'the tooltips carry the keys as chips rather than as more sentence');
assert(shell.includes('<div id="tip" role="tooltip"')
  && /#tip \{[^}]*position:\s*fixed[^}]*pointer-events:\s*none/s.test(shell)
  && /#tip \.tiparrow \{[^}]*transform:\s*rotate\(45deg\)/s.test(shell)
  && /#tip \.tiparrow\.under \{/.test(shell),
  'one tooltip card, click-through, with an arrow that can point either way');
assert(/function showTip\(el\)[\s\S]*?tip\.classList\.add\('show'\);[\s\S]*?getBoundingClientRect/.test(entry)
  && /const below = r\.bottom \+ gap \+ box\.height <= innerHeight - 6/.test(entry)
  && /arrow\.style\.left/.test(entry),
  'the card is measured before it is placed, and the arrow tracks the button, not the card');
assert(/addEventListener\('pointerdown', hideTip, true\)/.test(entry)
  && /addEventListener\('scroll', hideTip, true\)/.test(entry)
  && /addEventListener\('focusin'[\s\S]*?:focus-visible[\s\S]*?showTip\(el\)/.test(entry),
  'it goes away on the click it belongs to, and comes up for the keyboard too');

// The strip-part switches. Three moving pieces that only work together: the rows have
// to carry the class the CSS hides, the switches have to sit on the strip grid with the
// family ones, and hiding must be a class on the rack rather than a rebuild — a strip
// part that stopped hiding, or a switch that lost its width, would look like a layout
// bug rather than a broken toggle.
const partfilter = shell.indexOf('<div id="partfilter">');
const lanefilter = shell.indexOf('<div id="lanefilter">');
assert(partfilter > 0 && lanefilter > partfilter,
  'the strip-part switches come before the track-family switches in the header');
assert(/#partfilter button,\s*#lanefilter button \{[^}]*width:\s*var\(--stripw\)/s.test(shell),
  'both sets of switches are one strip wide, so they line up with the channels');
assert(/#rackwrap\.no-eq \.eqrow,[\s\S]{0,200}?#rackwrap\.no-fx \.fxbtns,\s*#rackwrap\.shed-fx \.fxbtns \{ display: none; \}/
  .test(shell), 'the rack classes hide the EQ rows, the send rows and the insert slots');
assert(/function eqRow[\s\S]*?classList\.add\('eqrow'\)/.test(entry)
  && /SHORT\[aux\.id\][\s\S]*?classList\.add\('sendrow'\)/.test(entry),
  'the EQ and send rows carry the classes those rules hide');
// The gap above the fader belongs to the foot. It used to be the insert block's top
// margin, which meant switching Effects off took it away and stood the fader hard
// against the last send row.
assert(/\.strip \.stripfoot \{[^}]*padding-top:\s*10px/s.test(shell),
  'the foot reserves the air above whatever it starts with');
assert(/\.fxbtns \{[^}]*margin:\s*0 0 8px/s.test(shell),
  'the insert block carries only the gap under it, so hiding it cannot take the one above');
// Scoped to .stripbody on purpose: the voice editor's own panels use .devlink and are
// spaced to their own layout, and every strip carries this row, so the EQ under it
// lines up across the rack only while the air above and below is the same everywhere.
assert(/\.stripbody > \.devlink \{\s*margin: 5px 0 6px/.test(shell),
  'the voice row has air on both sides, on every strip and nowhere else');
assert(entry.includes("const PARTS_KEY = 'mash-mixer-hidden-parts'")
  && entry.includes('localStorage.setItem(PARTS_KEY'),
  'which parts are hidden is remembered across reloads');
assert(/function applyStripParts\(\)[\s\S]*?wrap\.classList\.toggle\(p\.cls[\s\S]*?requestAnimationFrame\(fitStrips\)/
  .test(entry) && !/function applyStripParts\(\)[\s\S]*?buildRack\(\)/.test(entry.slice(
    entry.indexOf('function applyStripParts()'), entry.indexOf('function buildPartFilter'))),
  'toggling a part re-fits the strips by class, without rebuilding the rack');
assert(/buildLaneFilter\(all\);[\s\S]{0,120}?buildPartFilter\(\);[\s\S]{0,80}?applyStripParts\(\)/.test(entry),
  'a rack rebuild redraws the switches and re-applies the hidden parts');

// A docked voice editor collapses, it does not close: beside a strip it folds back into
// the strip that opens it, in the library it folds to the rail. Only the floating window
// — which has neither a lane nor a dock — keeps the ✕.
assert(/const folds = el\.classList\.contains\('vedocked'\) \|\| !!state\.laneKey;/.test(editor),
  'the editor folds whenever it is docked — beside a strip as well as in the library');
assert(/if \(folds\) shut\.append\(foldIcon\('left'\)\); else shut\.textContent = '✕';/.test(editor),
  'folding shows the « that mirrors the » which opened it, closing keeps the ✕');
assert(/#voiceedit \.veclose\.vefold \{[^}]*width:\s*28px[^}]*height:\s*28px/s.test(shell),
  'the fold mark is the same box wherever the panel is docked');
// The » on the strip head and the « in the editor are one pair, so they are one box in
// one corner: same size, same offsets, measured identical on the live page (top 223,
// centre 237). Kept as literals here because the whole point is that the two agree.
assert(/\.stripedit \{[^}]*top:\s*4px;\s*right:\s*2px;\s*width:\s*28px;\s*height:\s*28px/s.test(shell)
  && /#voiceedit \.veclose\.vefold \{[^}]*right:\s*2px/s.test(shell)
  && /#voiceedit \.veclose \{[^}]*top:\s*4px/s.test(shell),
  'the strip’s » sits in the same 28px corner box as the editor’s «, so they line up');
assert(/\.stripedit \{[^}]*z-index:\s*2[^}]*background:\s*color-mix/s.test(shell),
  'the » draws over the strip name with its own backing rather than blending into it');
assert(/\.voicepair > \.strip \.striphead:hover \.stripedit,\s*\.voicepair > \.strip \.stripedit \{\s*display: none/s
  .test(shell), 'the » is gone while the panel it opens is out, hover included');

console.log(failed ? 'MIXER LAYOUT: FAILED' : 'MIXER LAYOUT: OK');
process.exit(failed ? 1 : 0);
