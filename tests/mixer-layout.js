// The mixer has two adjustable vertical boundaries: the arrangement splitter and
// the new boundary between the channel rack and the effects shelf. Keep the live
// page contract in a small source test so a future shell edit cannot leave the
// handle unrendered, uncounted by the layout math, or detached from its drag code.
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../tools/mixer-shell.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const librarySource = readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
const voiceSource = readFileSync(new URL('../src/data/voices.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../tools/mixer.js', import.meta.url), 'utf8');
const seq = readFileSync(new URL('../tools/mixer-step-seq.js', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
const touchedBody = /const touched = \(\) => \{[\s\S]*?\n  \};/.exec(editor)?.[0] || '';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(!/schedulePreview|previewNote/.test(touchedBody)
  && !/let previewTimer|const schedulePreview/.test(editor),
  'editing a drum or noise parameter does not schedule an unsolicited note preview');

const envelopeTimeRows = editor.match(/envTime\(/g) || [];
assert(/const ENV_MAX_SECONDS = 10;/.test(editor)
  && /const ENV_TIME_SCALE = 2;/.test(editor)
  && /n\(path, label, min, ENV_MAX_SECONDS, step/.test(editor)
  && /\{ \.\.\.opts, scale: ENV_TIME_SCALE \}/.test(editor)
  && envelopeTimeRows.length >= 19
  && /SUSTAIN', 0, 100, 1/.test(editor)
  && /write: \(v\) => v \/ 100/.test(editor),
  'all envelope time controls share a 10-second maximum and sustain is edited as 0–100%');

const entrySource = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
assert(/function knob\(\{ min, max, step, value, fmt, onInput, reset, scale = 1 \}\)/.test(entrySource)
  && /Math\.pow\(clamp\(position, 0, 1\), curve\)/.test(entrySource)
  && /setPosition\(position \+ \(px \/ 150\)/.test(entrySource)
  && /scale: row\.scale/.test(editor),
  'all envelope controls use the shared non-linear knob response');

assert(/const SOURCES = \[[\s\S]*?label: 'Library'[\s\S]*?label: 'My presets'/.test(
  librarySource)
  && /const keepSource = SOURCES\.find/.test(
    librarySource)
  && /className = 'vsource'/.test(
    librarySource),
  'the preset library distinguishes read-only Library sounds from editable My presets');
assert(/head\.append\(title, sources, chips, syn, search, close\)/.test(
  librarySource)
  && /#voicelib \.vlclose \{ margin-left: auto; \}/.test(shell)
  && !/const searchRow = document\.createElement\('div'\)/.test(
    librarySource),
  'the preset search sits in the top header immediately before the far-right close');
assert(/searchInput = search/.test(librarySource)
  && /searchInput\?\.focus\(\{ preventScroll: true \}\)/.test(librarySource),
  'opening the preset library focuses the Search presets field');
assert(/if \(voiceLibrary\.isCollapsed\('edit'\)\) voiceLibrary\.collapse\('edit', false\)/.test(entry)
  && /if \(localStorage\.getItem\('mash-mixer-library-open'\)\) openPresetLibrary\(\)/.test(entry),
  'opening or restoring the preset library reveals its blank editor workspace');
assert(shell.includes('id="panicbtn"')
  && /#panicbtn \{[^}]*background: var\(--hot\)/.test(shell)
  && shell.indexOf('id="panicbtn"') > shell.indexOf('id="undo"'),
  'the mixer header exposes a visibly urgent Panic button on the right');
assert(/function silenceAll\(\)[\s\S]*?Audio\.panic\(\)/.test(entry)
  && /function panicAll\(\)[\s\S]*?const restoreMidi = midiOn[\s\S]*?setMidi\(false, \{ announce: false \}\)[\s\S]*?silenceAll\(\)[\s\S]*?if \(restoreMidi\) setMidi\(true, \{ announce: false \}\)/.test(entry)
  && /async function setMidi\(on, \{ announce = true \} = \{\}\)/.test(entry),
  'Panic temporarily disables MIDI input and restores it only when it was already on');
assert(/toast\(restoreMidi[\s\S]*?MIDI restored[\s\S]*?MIDI off/.test(entry),
  'Panic reports whether MIDI was restored or left off');
const stopClick = /\$\('stop'\)\.onclick = \(\) => \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
assert(/function silenceAll\(\)[\s\S]*?releaseOskSources\('m:'\)/.test(entry)
  && /silenceAll\(\)[\s\S]*?jumpTo\(at\)/.test(stopClick)
  && !/setMidi\(/.test(stopClick)
  && /id="stop"[^>]*data-tipsays="[^"]*release held notes and silence every live sound/.test(shell)
  && !/id="stop"[^>]*data-tipsays="[^"]*turn off MIDI input/.test(shell),
  'Stop silences held notes without changing MIDI and explains its silence-only behavior');
assert(/panic\(\)[\s\S]*?this\._cutLaneGates\(\)[\s\S]*?this\.voices\.dispose\(\)[\s\S]*?this\.bank = null/.test(audio)
  && /resumeAfterPanic\(\)[\s\S]*?this\.levels\.master/.test(audio)
  && /previewNote\([^\n]*\)[\s\S]*?this\.resumeAfterPanic\(\)/.test(audio),
  'the audio engine cuts live buses and held voices, then restores on a deliberate preview');
assert(/const isLibraryPreset = \(voice\) =>/.test(editor)
  && /const isUserPreset = \(voice\) =>/.test(editor)
  && /const libraryOwner =/.test(editor)
  && /v\.songOrigin === 'library'/.test(editor)
  && /const songOrigin = params\.songOrigin/.test(voiceSource)
  && /const songSourceId = params\.songSourceId/.test(voiceSource)
  && /draft: true/.test(editor)
  && /if \(draft\) \{\s*delete VOICES\[fromId\]/.test(editor)
  && /librarySource: isNew && !laneKey \? voiceId : null/.test(editor)
  && /if \(isLibraryPreset\(from\) && !isNew/.test(editor)
  && /const canDelete = !state\.laneKey && !state\.librarySource/.test(editor)
  && /isDevUser\(\) && isLibraryPreset\(v\)/.test(editor)
  && /foot\.revertBtn\.disabled = dev \? !state\.dirty : false/.test(editor)
  && /if \(state\.isNew\) \{[\s\S]*?delete VOICES\[state\.id\]/.test(editor)
  && /del\.textContent = 'Delete'/.test(editor)
  && /if \(!isUserPreset\(v\) && !devLibrary\)/.test(editor)
  && /const ok = await ask\(/.test(editor)
  && !/confirm\(state\.isNew/.test(editor)
  && /function blank\(\)/.test(editor)
  && /No preset selected/.test(editor)
  && /if \(libraryWindow\) \{ blank\(\); onChanged\(\); \}/.test(editor)
  && /const nameClash = \(wanted\) =>/.test(editor)
  && /wanted !== state\.id && clash !== state\.voice/.test(editor)
  && /userTableFor\(v\.kind\)/.test(editor)
  && /asNew\.textContent = 'Save as New'/.test(editor)
  && !/Save User Preset/.test(editor)
  && /asNew\.title = isLibrary && canUpdateLibrary/.test(editor)
  && /libraryUpdate/.test(editor)
  && /libraryTableFor/.test(editor)
  && /state\.libraryNew/.test(editor)
  && /requestedLibrary/.test(server)
  && /devLibraryCreate/.test(server)
  && /const devDelete =/.test(server)
  && !/confirm\(`Save preset as/.test(editor)
  && editor.indexOf('if (state.laneKey && assign) assign(state.laneKey, newId);')
    < editor.indexOf('await commit({ keepLane: true });')
  && /state\.voice\?\.songLocal/.test(touchedBody)
  && /VOICES\[state\.id\] = state\.voice;/.test(touchedBody)
  && touchedBody.indexOf('VOICES[state.id] = state.voice;')
    < touchedBody.indexOf('refresh(state.id);')
  && /const songUserSource = !!\(v\.songLocal && v\.songOrigin === 'user'/.test(editor)
  && /const canUpdate = !state\.isNew && \(v\.songLocal/.test(editor)
  && /const songUserUpdate = !state\.isNew && v\.songLocal/.test(editor)
  && /const saveId = songUserUpdate \? v\.songSourceId : state\.id/.test(editor)
  && /const btn = foot\.saveBtn \|\| foot\.updateBtn \|\| foot\.saveNewBtn/.test(editor)
  && /const canSubmit = libraryDraft \|\| state\.isNew \|\| canUpdate/.test(editor)
  && /const userLibraryEditor = !isDevUser\(\) && !state\.laneKey/.test(editor)
  && /const userLibraryCancel = !isDevUser\(\) && !state\.laneKey/.test(editor)
  && /revert\.textContent = userLibraryCancel \? 'Cancel' : 'Revert'/.test(editor)
  && /state\.voice\?\.songLocal\n\s*\? 'Save this song-local copy/.test(editor)
  && /saveNew\.onclick = \(\) => openSaveSheet\('new'\)/.test(editor)
  && /update\.onclick = \(\) => openSaveSheet\('update'\)/.test(editor)
  && /if \(userLibraryEditor\) \{[\s\S]*?bar\.append\(saveNew\)[\s\S]*?bar\.append\(update\)/.test(editor)
  && /async function openSaveSheet\(action = 'choose'\)/.test(editor)
  && /const showAsNew = offerFork/.test(editor)
  && /const showCommit = canSubmit/.test(editor)
  && /const DEV_USER = true/.test(server)
  && /allowLibraryUpdate/.test(entry)
  && shell.includes('window.__MASH_MIXER_DEV_USER__ = /*__MIXER_DEV_USER__*/;')
  && /const _urlDev = new URLSearchParams\(location\.search\)\.get\('dev'\)/.test(entry)
  && /const DEV_USER = _urlDev === '0' \? false : globalThis\.__MASH_MIXER_DEV_USER__ === true/.test(entry)
  && /mixerShell\s*\.replace\('\/\*__MIXER_DEV_USER__\*\/', 'false'\)/.test(
    readFileSync(new URL('../build/build.js', import.meta.url), 'utf8'))
  && /if \(!Object\.values\(USER_TABLES\)\.includes\(sourceTable\) && !\(devDelete && libraryTable\)\)/.test(server),
  'library presets use one hidden editor draft, role-specific save/delete rules, and deletes use the desk dialog');
assert(shell.indexOf('<span id="songrole"') > shell.indexOf('<span id="nowsong"')
  && /const role = \$\('songrole'\)/.test(entry)
  && /role\.textContent = DEV_USER \? 'DEV' : 'USER'/.test(entry),
  'the footer identifies the current mixer role after the song name');
assert(/v\.kind === 'engine' \|\| v\.songLocal \|\| v\.draft/.test(
  readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /!v\.songLocal && !v\.draft/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /voiceEditor\.librarySource === id/.test(entry)
  && /const scrollTop = el\.querySelector\('\.vlresults'\)\?\.scrollTop/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /if \(results\) results\.scrollTop = scrollTop/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /ev\.detail >= 2 && collapsed\.edit/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /setCollapsed\('edit', false\)/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /let heard = null/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /player\.setVoice\(heard\)/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /const id = editing\?\.\(\) \|\| heard \|\| picked/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8')),
  'unsaved library drafts stay out of the preset list, repeated source clicks reuse them, and every audition path follows the editable draft');
assert(/const FOLD_KEY = 'mash-mixer-voicelib-folds'/.test(
  readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /localStorage\.setItem\(FOLD_KEY/.test(
    readFileSync(new URL('../tools/mixer-voice-library.js', import.meta.url), 'utf8'))
  && /if \(!voiceLibrary\.isCollapsed\('edit'\)\)/.test(entry)
  && /voiceEditor\.blank\(\)/.test(entry)
  && /onBlank: \(\) => voiceLibrary\.clearPick\(\)/.test(entry)
  && /\n  ask,/.test(entry),
  'the library restores the editor unless explicitly hidden and keeps a blank editor after deletion');

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
// Bounded to the function's own body. `[\s\S]*?` is lazy but unbounded, so a regex
// anchored on `function notesRoom(` happily reaches `h($('devsplit'))` in planDesk two
// hundred lines below and passes however notesRoom is written.
const notesRoomBody = /function notesRoom\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(notesRoomBody.includes("h($('devsplit'))"),
  'layout calculations reserve the effects splitter');
assert(entry.includes('function syncDeskSplitter()')
  && /function setDevicesFolded[\s\S]*?syncDeskSplitter\(\)/.test(entry)
  && /function setMixerFolded[\s\S]*?syncDeskSplitter\(\)/.test(entry)
  && /function setArrangeCollapsed[\s\S]*?syncDeskSplitter\(\)/.test(entry),
  'the handle hides when either adjacent panel is folded');
assert(/function setNotesFolded\([\s\S]*?syncDeskSplitter\(\);[\s\S]*?fitStrips\(\);[\s\S]*?requestAnimationFrame\(fitStrips\)/.test(entry),
  'collapsing notes refits once after flex layout settles so the mixer takes the freed space');
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
assert(entry.includes("const DESK_CHAIN = ['rackwrap', 'arrange', 'notes', 'deskslack']")
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
const minBody = /const MIN = \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
const wantBody = /const WANT = \{[\s\S]*?\n\};/.exec(entry)?.[0] || '';
assert(['timeline', 'arrange', 'mixer', 'notes', 'devices']
  .every((k) => new RegExp(`^\\s*${k}:`, 'm').test(minBody))
  && ['arrange', 'notes'].every((k) => new RegExp(`^\\s*${k}:`, 'm').test(wantBody))
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
  && notesRoomBody.includes('MIN.mixer()')
  && !notesRoomBody.includes('FADER_MIN')
  && !notesRoomBody.includes('laneRowHeight()'),
  'the notes handle clamps against the rack floor alone and cannot reach the arrangement');
// And it cannot reach it by construction, not just by not mentioning it: the arrangement
// height arrives as an ARGUMENT, so the handle trades rack for notes and the arrangement
// stays exactly where it is.
assert(/function notesRoom\(arrH = plannedArrangeHeight\(\)\)/.test(entry)
  && /const clampDeviceH = \(value, max = notesRoom\(\)\) => clamp\(value, MIN\.notes\(\), max\);/.test(entry),
  'the notes height is clamped between its own minimum and that room, nothing else');
assert(/function planDesk[\s\S]*?let rackH = room - arrH - notesH/.test(entry),
  'the arrangement and the notes panel are sized independently and the rack takes the difference');
// The effects panel is not in that sum at all — it takes what its cards need and is
// outside the elastic chain, which is what "fixed height" means here.
assert(/function planDesk[\s\S]*?const fxH = effectsNaturalHeight\(\);/.test(entry)
  && !/const DESK_CHAIN = \[[^\]]*'devices'/.test(entry),
  'while the effects panel has a fixed height and is outside the chain entirely');

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
assert(/\.arrrow \.arrgain \{[^}]*width:\s*30px[^}]*height:\s*5px/s.test(shell)
  && /\.arrrow \.arrgain::-webkit-slider-thumb \{[^}]*width:\s*10px[^}]*height:\s*10px/s.test(shell)
  && /\.arrrow \.arrgain::-webkit-slider-runnable-track \{[^}]*background:\s*var\(--line2\)/s.test(shell)
  && /\.arrrow:not\(:hover\) \.arrgain \{ opacity:\s*\.72; \}/.test(shell),
  'arrangement track volume trims are comfortably draggable with a visible rail');
assert(/gainSlider\.className = 'arrgain'[\s\S]*?gainWrap\.append\(gainSlider, gainReadout\);\s*header\.append\(gainWrap\);\s*el\.append\(header, bars\)/.test(entry),
  'each tiny volume trim is placed in the header immediately before its bars');
assert(/\.arrgainreadout \{[^}]*position:\s*absolute[^}]*bottom:\s*calc\(100% \+ 4px\)[^}]*font-variant-numeric:\s*tabular-nums/s.test(shell)
  && /gainReadout\.className = 'arrgainreadout'[\s\S]*?pointerdown[\s\S]*?gainReadout\.classList\.add\('show'\)[\s\S]*?pointerup/.test(entry),
  'the hidden arrangement gain readout appears with the dB value only while dragging');
assert(/setMixerFolded\([\s\S]*?arrange'\)\.classList\.toggle\('track-gain-visible', on\)/.test(entry)
  && /#arrange\.track-gain-visible \.arrrow \.arrgainwrap \{ display: block; \}/.test(shell),
  'arrangement gain trims are shown only while the Mixer is collapsed');
assert(/\$\('addtrackbtn'\)\.onclick[\s\S]*?addPercussionLane\(\)/.test(entry)
  && !entry.includes('openAddTrackPicker'),
  'the plus opens one new track and its preset selector without a choice menu');
assert(/function openVoicePicker[\s\S]*?className = 'voiceclose popclose'[\s\S]*?closeMenu\(\)/.test(entry)
  && /function openVoicePicker[\s\S]*?draw\(''\);[\s\S]*?el\.classList\.add\('show'\);[\s\S]*?search\.focus\(\{ preventScroll: true \}\)/.test(entry)
  && /#voicepicker button\.voiceclose \{[^}]*width:\s*34px[^}]*height:\s*34px[^}]*font-size:\s*23px/s.test(shell),
  'the preset selector has the large close button and focuses Search presets');
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
assert(/function openTrackEditor\(x, y, key, options = \{\}\)[\s\S]*?wholeTrack: true, \.\.\.options/.test(entry)
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
  && /label: 'Rename Track…'[\s\S]*?focusName: true/.test(entry)
  && !/async function renameLane/.test(entry)
  && /customLayerLabel[\s\S]*?label: VOICES\[voiceId\]\.label/.test(entry),
  'the track panel names a desk-owned track at the top, and preserves it across preset changes');
assert(entry.includes("const SONG_LAYOUT_KEY = 'mash-mixer-song-layout'")
  && /function currentSongLayout\(\) \{[\s\S]*?keyboard:\s*oskShown\(\)[^}]*?notes:\s*![^}]*?grid:\s*stepSeq\.isOpen\(\)/.test(entry)
  && /function loadTrack\(id\)[\s\S]*?rememberSongLayout\(trackId\)[\s\S]*?restoreSongLayout\(id\)/.test(entry),
  'keyboard and both note editors are remembered as separate facts, and restored per song');
assert(/function showStepSeq\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showPianoRoll\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry)
  && /function showOsk\(on\)[\s\S]*?rememberSongLayout\(\)/.test(entry),
  'opening and closing the keyboard or either note editor updates its song layout');

// The two note editors, and the effects rack, are THREE separate places.
//
// This began as one panel with two views and one button, which made the roll and the kit
// exclusive — you could not look at the bassline and the drums together. Splitting the
// views apart fixed that; the roll then became its own panel (`#notes`) rather than a view
// hosted inside the effects region, which is what removed `deskView` altogether.
//
// So the claim is no longer "the roll is a view inside the effects region". It is that
// there are three independent surfaces and none of them can put another away:
//   #notes    a desk region, in the elastic chain, holding the piano roll
//   #devices  a desk region of its own, fixed height, outside the chain
//   #stepseq  a floating window, outside #desk entirely
const notesAt = shell.indexOf('<div id="notes">');
const rollAt = shell.indexOf('<div id="pianoroll">');
const stepseqAt = shell.indexOf('<div id="stepseq">');
assert(notesAt > 0 && rollAt > notesAt && rollAt < devices,
  'the piano roll lives in its OWN desk region (#notes), above the effects panel');
assert(devices > notesAt,
  'and the effects panel is a sibling of it, not its host — no view switch between them');
const rollSrc = readFileSync(new URL('../tools/mixer-piano-roll.js', import.meta.url), 'utf8');
// The roll's controls follow the roll. While the two were views of one region they were
// hosted in #devhead and that was right; once they became two panels it left a part
// picker, an octave nudge, a key and a scale on a header labelled Effects, with nothing
// under it they touched.
assert(/headerHost:\s*\(\)\s*=>\s*document\.getElementById\('notehead'\)/.test(rollSrc),
  'the roll\'s controls are hosted in the NOTES header, not the effects one');
assert(!/#devhead\s+\.ssqhostbar/.test(shell)
  && /#notehead \.ssqhostbar \{/.test(shell),
  'and the stylesheet moved with them');
// Clustered, not queued: seven controls in a row read as seven decisions. `group` makes
// them three — what am I editing, where am I looking, what key is it in — and the header
// rules a hairline between them. The scope button the grid appends is the fourth.
assert(/return \[group\('part',[^\]]*group\('view',[^\]]*group\('key',/.test(rollSrc),
  'the roll hands its controls over already clustered');
assert(/\.ssqhostbar \.ssqgrp \+ \.ssqgrp,\s*\.ssqhostbar \.ssqgrp \+ \.ssqlink \{[^}]*border-left/s.test(shell),
  'and the header fences the clusters — including the scope button it does not build');
// `.fxsel` is width:100%. Eight of them in one flex row is eight squeezed selects, and a
// native select clamped narrower than its text runs the text under its own arrow rather
// than eliding it — "Square Tone" came out reading "Square Tone✓".
assert(/\.ssqhostbar \.fxsel \{[^}]*width:\s*auto[^}]*flex:\s*none/s.test(shell),
  'the selects in that row are content-width and unsqueezable');
assert(stepseqAt > shell.indexOf('</main>'),
  'while the step grid is a floating window outside the desk regions altogether');
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
// One button each, and each opens ONLY its own panel. The old form of this checked that
// the view switch never reached `stepSeq`; with the views gone it is the simpler and
// stronger claim — the roll's open path knows nothing about the grid, and vice versa.
assert(/\$\('seqbtn'\)\.onclick = \(\) => showStepSeq\(!stepSeq\.isOpen\(\)\)/.test(entry),
  'the grid has its own button, which toggles the grid');
assert(/\$\('rollbtn'\)\.onclick = \(\) => showPianoRoll\(\$\('notes'\)\.classList\.contains\('collapsed'\)\)/
  .test(entry),
  'and the roll has its own, which folds or unfolds the notes region');
{
  const roll = /function showPianoRoll\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  const folded = /function setNotesFolded\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(roll && !/stepSeq\./.test(roll) && folded && !/stepSeq\./.test(folded),
    'opening the roll cannot open or shut the grid — you can work on the bassline and the'
    + ' kit at the same time, which is the whole reason they were split apart');
  const seq = /function showStepSeq\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(seq && !/setNotesFolded|showPianoRoll/.test(seq),
    'and opening the grid cannot fold the roll away either');
}
// The toolbar light comes off the panel's own folded state, so the button and the panel
// cannot disagree about whether the roll is up.
assert(/function setNotesFolded[\s\S]*?\$\('rollbtn'\)\.classList\.toggle\('on', !on\)/.test(entry),
  'the roll’s toolbar light is set where the panel is folded, so it agrees with the'
  + ' Notes chip and with the fold chevron');

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

// ---- recording ---------------------------------------------------------------------
//
// The take buffer and the clock are unit-tested in tests/note-recorder.js. What cannot
// be tested there is the WIRING, and every assertion below is here because the failure
// it catches is invisible in a diff and audible only as "the recorder is broken".

// The arm lives in the keyboard's own title bar, next to the two inputs it decides the
// fate of, and it is built in JS like the other two rather than sitting in the markup.
assert(/recBtn\.className = 'oskrec';/.test(entry)
  && /head\.append\(title, warn, sp, midiBtn, catchBtn, recBtn, close\);/.test(entry),
  'the Record button is built into the OSK head, between MIDI/Keyboard and the close');
assert(/#osk \.oskrec\.on \{[^}]*var\(--solo\)/s.test(shell)
  && /#osk \.oskrec\.live \{[^}]*var\(--hot\)/s.test(shell),
  'armed and recording are two different colours, and both are the desk’s own state'
  + ' variables so every theme including the light ones already defines them');
assert(/#osk \.oskrec::before \{/.test(shell),
  'the armed/recording state dot is a pseudo-element, so the button has no extra badge element');

// THE assertion. A glide across the keys and a roll across the pads arrive as
// pointermove and fire as fast as the pointer does; recording them puts sixteen
// semitones in a bar every time somebody goes looking for a note.
assert(/function oskPlay\(midi, \{ record = true, src = null \} = \{\} \)?/.test(entry)
  || /function oskPlay\(midi, \{ record = true, src = null \} = \{\}\) \{/.test(entry),
  'oskPlay takes a record option, so a gesture can say it is not a note');
assert(/function oskHit\(laneKey, \{ record = true, src = null \} = \{\}\) \{/.test(entry),
  'and so does oskHit');
assert(/keys\.addEventListener\('pointermove'[\s\S]{0,300}?oskHeldVisuals\.get\(src\) === k[\s\S]{0,300}?releasePreview\(src\)[\s\S]{0,200}?oskPlay\([\s\S]{0,200}?\{ record: false, src \}\)/
  .test(entry), 'a GLIDE releases the previous preview and is not recorded');
assert(/pads\.addEventListener\('pointermove'[\s\S]{0,400}?oskHit\([^)]*\{ record: false \}\)/
  .test(entry), 'and neither is a ROLL across the pads');

// All three inputs name the finger they came from, or a note-off cannot find its
// note-on and every note in the take would take the length of the last one.
assert(/const src = `p:\$\{ev\.pointerId\}`;[\s\S]{0,120}?oskPlay\(Number\(k\.dataset\.midi\), \{ src \}\)/.test(entry),
  'a clicked key records under its pointer id');
assert(/const src = `k:\$\{key\}`;[\s\S]{0,120}?oskPlay\(midi, \{ src \}\)/.test(entry),
  'a typed key records under the letter, which is what keyup will report');
assert(/const src = `m:\$\{note\}`;[\s\S]{0,120}?oskPlay\(note, \{ src \}\)/.test(entry),
  'a MIDI note records under its note number');
assert(/function oskHoldVisual\(src, el\)[\s\S]{0,300}?classList\.add\('held'\)/.test(entry)
  && /function oskReleaseVisual\(src\)[\s\S]{0,250}?classList\.remove\('held'\)/.test(entry)
  && /\.oskkey\.white\.held/.test(shell) && /\.oskpad\.held/.test(shell),
  'a held input keeps its key or pad highlighted until its release');
// One release closes both halves of a held preview: the recording token, when armed,
// and the audio voice, which is what mouse release used to miss.
assert(/function releasePreview\(src\)[\s\S]{0,180}Audio\.releasePreviewNote\(held\.laneKey, held\.freq\)/
  .test(entry)
  && /function oskRelease\(src\)[\s\S]{0,100}releasePreview\(src\)/.test(entry)
  && /pads\.addEventListener\(type, \(ev\) => oskRelease\(`p:\$\{ev\.pointerId\}`\)\)/.test(entry)
  && /keys\.addEventListener\(type, \(ev\) => oskRelease\(`p:\$\{ev\.pointerId\}`\)/.test(entry),
  'mouse release closes both the recording token and the sounding preview note');
// The note-off half, which did not exist at all until recording had a use for it.
assert(/if \(kind === 0x80 \|\| \(kind === 0x90 && !vel\)\) \{[\s\S]*?oskRelease\(`m:\$\{note\}`\);[\s\S]*?return; \}/
  .test(entry),
  'a MIDI note-off is an actual 0x80 OR a note-on at velocity zero — most keyboards'
  + ' send the second, and reading only the first loses every length');
assert(/addEventListener\('keyup'[\s\S]{0,300}?oskRelease\(`k:\$\{key\}`\)/.test(entry),
  'a computer key gets its length from the keyup that already stopped auto-repeat');
assert(/for \(const type of \['pointerup', 'pointercancel'\]\)/.test(entry),
  'and a pointer gets it from pointerup — pointercancel too, or a gesture ending some'
  + ' other way leaves the note open and it takes the whole take’s length');

// The one invariant that would be catastrophic and is cheap to reintroduce.
assert(/function recordNote\([\s\S]*?\n\}/.test(entry)
  && !/function recordNote\([\s\S]*?\n\}/.exec(entry)[0].includes('applyArrangementEdit'),
  'recordNote NEVER commits — applyArrangementEdit pushes undo, revalidates the whole'
  + ' arrangement and rebuilds the timeline, so a per-note commit would mean one undo'
  + ' step per note and a desk rebuild on every key');
assert(/function flushTake\([\s\S]*?writeBarNotesShared\(eb, d, bar, lane, notes16, lengths16\)/
  .test(entry),
  'a take is written SHARED — recording into a loop changes the pattern, or a note'
  + ' played into bar 1 of a four-bar section returns every fourth pass');
assert(/atStep: loopOn \? loopAnchor : Audio\.step/.test(entry),
  'and re-arms the loop where it already was — applyLoop snaps to the bar it is given,'
  + ' so re-arming from Audio.step walks a two-bar loop forward on every flush');

// The flush boundaries. Each one of these is a way a take can be silently lost.
for (const [fn, why] of [
  ['function setPlaying', 'the transport stopping ends the take'],
  ['function undo', 'undo writes the take first, so ⌘Z removes what you just played'],
]) {
  const body = new RegExp(`${fn}\\([\\s\\S]*?\\n\\}`).exec(entry)?.[0] || '';
  assert(/endTake\(/.test(body), why);
}

// ---- the BEAT is the boundary, not the bar ----------------------------------------
//
// It was the bar line, and that was too slow to play against: at 120bpm you could play a
// note and watch two seconds of nothing before it appeared in the roll — long enough to
// think it had been missed and play it again. A beat is four times sooner and free,
// because the undo steps coalesce.
assert(/function recordFollow\([\s\S]*?Math\.floor\(heardStep \/ 4\)/.test(entry),
  'the flush boundary is the BEAT — a bar line is two seconds at 120bpm, which is long'
  + ' enough to look like the recorder missing the note');
assert(/function recordFollow\([\s\S]*?if \(beat !== recLastBeat \|\| heardStep < recLastHeard\)/
  .test(entry),
  'and time going BACKWARDS counts as a crossing too — on a short loop the wrap is the'
  + ' only signal there is');
assert(!/recLastBar/.test(entry),
  'and nothing still reads the bar counter it replaced — a stale one leaves the beat'
  + ' tracking unseeded and flushes once for nothing on every play');
assert(/undoTag: 'record'/.test(entry)
  && /if \(undoable\) pushUndo\(undoTag\);/.test(entry),
  'four writes a bar are free because they COALESCE — pushUndo already merges same-tagged'
  + ' edits inside 700ms, so a continuous phrase is one ⌘Z rather than one per beat');

// ---- everything the recorder uses is actually imported ---------------------------
//
// Twice now a function has been used here and left out of the import list. esbuild
// bundles it happily — an undefined global is legal JavaScript until it runs — so the
// first sign is a ReferenceError on the first recorded note. Cheap to check, and it
// checks the whole module rather than the two that got caught by hand.
{
  const recorder = readFileSync(new URL('../tools/lib/note-recorder.js', import.meta.url), 'utf8');
  const exported = [...recorder.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  // `[^}]*` rather than `[\s\S]*?`: an import list holds no braces, and a lazy match
  // anchored on the first `import {` in the file swallows every import above this one.
  const importRe = /import \{([^}]*)\} from '\.\/lib\/note-recorder\.js';/;
  const importBlock = importRe.exec(entry)?.[1] || '';
  const imported = new Set(importBlock.split(',').map((s) => s.trim()).filter(Boolean));
  assert(imported.size > 0, 'the desk imports from note-recorder.js at all');
  const body = entry.replace(importRe, '');
  const missing = exported.filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(body) && !imported.has(name));
  assert(missing.length === 0,
    `every note-recorder function the desk calls is in its import list (missing: ${JSON.stringify(missing)})`);
  const unused = [...imported].filter((name) => !new RegExp(`\\b${name}\\s*\\(`).test(body));
  assert(unused.length === 0,
    `and nothing is imported that is not called (dead: ${JSON.stringify(unused)})`);
}
assert(/function flushTake\([\s\S]*?applyArrangementEdit\(d, null, \{/.test(entry),
  'and EVERY write is silent — a toast four times a bar is not notice, it is weather');
{
  const body = /function flushTake\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(/const live = reason === 'beat'/.test(body)
    && /render: !live/.test(body)
    && /persist: !live/.test(body)
    && /rearmLoop: !live/.test(body),
    'beat recording commits keep the live arrangement current without rebuilding the desk,'
    + ' writing storage, or re-arming the loop on every boundary');
  assert(/function finalizeLiveTake\([\s\S]*?localStorage\.setItem\(ARRANGE_KEY/.test(entry),
    'the deferred recording persistence and redraw happen once when the take ends');
}
// The summary has to hang off the take ending, not off the last write: a beat flush has
// almost always emptied the buffer by the time you disarm, so a toast on the final write
// fired only if you stopped within half a second of playing.
assert(/function endTake\([\s\S]*?if \(announce && recSessionNotes > 0\)[\s\S]*?toast\(/.test(entry),
  'the "Recorded N notes" summary comes from endTake and the session totals, so it fires'
  + ' whenever a take ends rather than only when the buffer happened to be non-empty');
assert(/if \(recArmed\) endTake\('undo', \{ announce: false \}\);/.test(entry),
  'except on undo — "Recorded 6 notes" a moment before taking them away is a lie about'
  + ' what just happened');
assert(/function discardTake\(\)[\s\S]*?recSessionNotes = 0;/.test(entry),
  'and a discarded take resets the totals, or endTake announces one that was abandoned');

// ---- a key still down when the take is flushed ------------------------------------
//
// The regression the beat flush caused, and the reason it is pinned here rather than left
// to be noticed: clearing the take threw away the open-note tokens with it, so a note-off
// arriving after a flush had nothing to attach a length to and the note kept the roll's
// one-step default. Nearly invisible at a two-second bar flush — most notes are released
// inside their own bar. Near-universal at 500ms.
{
  const body = /function flushTake\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
  assert(!/recOpen\.clear\(\)/.test(body),
    'a flush does NOT clear the held-note map — a key that is still down has not finished'
    + ' being a note, and dropping it made every held note come out a sixteenth long');
  assert(/carryHeld\(\)/.test(body),
    'it re-adds the held notes to the fresh take instead, so their eventual note-off'
    + ' still has somewhere to write a length');
  assert(body.indexOf('applyArrangementEdit') < body.indexOf('carryHeld()'),
    'and it does that AFTER the write, so the re-seeded notes read a draft that holds them');
}
assert(/function carryHeld\(\)[\s\S]*?recOpen\.set\(src, \{ \.\.\.held, token \}\)/.test(entry),
  'carryHeld repoints the token and keeps everything else — `at` above all, so the length'
  + ' is still measured from the original press rather than from the last flush');
assert(/if \(src\) recOpen\.set\(src, \{ token, at: heard, bar, lane: laneKey, step: inBar, midi, freq \}\);/
  .test(entry),
  'which is why a held note records where it is as well as when — a re-add needs the bar,'
  + ' lane, step and pitch, not just the token');
assert(!/function recCount\(/.test(entry) && !/recCount\(\)/.test(entry)
  && !/Record · \$\{n\}/.test(entry) && !/data-count/.test(entry) && !/data-count/.test(shell),
  'recording has no live note-count badge; the transport only communicates armed/recording state');
assert(/let recSessionNotes = 0;[\s\S]*?if \(announce && recSessionNotes > 0\)[\s\S]*?toast\(/.test(entry),
  'the completion toast still keeps the session total and reports what was recorded when the take ends');

// ---- a chord stays a chord --------------------------------------------------------
assert(/chordAnchor\(recChord, performance\.now\(\)/.test(entry),
  'notes are anchored to the first of a cluster, or a chord whose notes land either side'
  + ' of a rounding boundary splits into a note plus a dyad a step later');
assert(/!polyLane\(editBank\(\), laneKey\) && laneKind\(laneKey\) !== 'perc' && !recChordWarned/
  .test(entry),
  'and a chord played into a lane that genuinely cannot hold one says so — one note out'
  + ' of three kept silently is indistinguishable from the recorder dropping them');

// ---- which lanes can hold a chord --------------------------------------------------
//
// Not `CHORD_LANES`. That named the two lanes whose hand-written playback loops over the
// step, and it was the whole answer until the rack arrived — the rack is deliberately
// lane-agnostic about polyphony, so what decides it is which code plays the step.
assert(/stacks: \(lane\) => polyLane\(editBank\(\), lane\)/.test(entry),
  'the recorder asks polyLane which lanes stack');
{
  const voices = readFileSync(new URL('../src/data/voices.js', import.meta.url), 'utf8');
  const body = /export function polyLane\([\s\S]*?\n\}/.exec(voices)?.[0] || '';
  assert(/PERCUSSION_LANES\.includes\(base\)\) return false/.test(body)
    && /!MONO_LANES\.includes\(base\)/.test(body),
    'and polyLane is now about the LANE alone — percussion holds booleans, the gesture'
    + ' and word lanes hold one shape per step, and everything pitched can hold a chord');
  assert(!/v\.kind !== 'engine'/.test(body),
    'with no preset test left in it: the four hand-written pitched bodies loop over the'
    + ' step now, so "which code plays it" no longer changes the answer');
  const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
  assert(/const tonesOf = \(v\) => \(Array\.isArray\(v\)/.test(audio),
    'scheduleStep resolves a step to a LIST of frequencies');
  for (const lane of ['lead', 'bass', 'leadHarm', 'twinkle']) {
    assert(new RegExp(`for \\(const \\w+ of tonesOf\\(b\\.${lane}\\[s\\]\\)\\)`).test(audio),
      `and ${lane}'s hand-written body runs once per tone — free, because play() builds`
      + ' its own oscillator per call, which is why two keys at once always sounded');
  }
  assert(/const bassRoot = tonesOf\(b\.bass\[s\]\)\[0\];/.test(audio),
    'and the star arpeggio takes a chord\u2019s lowest tone as its root rather than the'
    + ' whole array, which would have broken it');
}
// The roll stays VALUE-based, which is what keeps this change invisible to editing: most
// rack-voiced lanes in the game are bass and lead, single-note parts where clicking a new
// pitch on an occupied step is how you CORRECT a note. Only a step that already holds a
// chord behaves chordally.
assert(/const isChord = \(value\) => CHORD_LANES\.includes\(baseLane\(lane\(\)\)\) \|\| Array\.isArray\(value\);/
  .test(readFileSync(new URL('../tools/mixer-piano-roll.js', import.meta.url), 'utf8')),
  'the roll decides chord-ness from the STEP VALUE, not from whether the lane could hold'
  + ' one — so a click on a single-note lane still replaces, as it always has');

// ---- MIDI and Record reach the song without the keyboard open ---------------------
//
// The gate was there so a song could not change for reasons you cannot see. The arm is
// in the header now and stays lit whatever is shut, which serves that better than making
// you open a window you are not looking at.
for (const id of ['midibtn', 'recbtn']) {
  assert(new RegExp(`id="${id}"[^>]*class="[^"]*\\biconbtn\\b`).test(shell),
    `${id} is an icon button in the header, in the row with the other four`);
  assert(new RegExp(`\\$\\('${id}'\\)\\.onclick`).test(entry),
    `and ${id} is wired to the same function the keyboard's own button calls`);
}
const midiBody = /function onMidiMessage\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(!/if \(!oskShown\(\) \|\| !oskPlayable/.test(midiBody)
  && /if \(!oskPlayable\(selectedLane\)\) return;/.test(midiBody),
  'MIDI is NOT gated on the keyboard being open — a MIDI keyboard is a real instrument'
  + ' and your eyes are on your hands, not on a drawn one. A channel to play is still'
  + ' required, because that is where the notes would go.');
// The one remaining `oskShown` in here is a guard on LIGHTING a drawn key, and it has to
// sit after the note has sounded — in front of it, it would be the old gate again.
assert(midiBody.indexOf('oskPlay(note') < midiBody.indexOf('if (!oskShown()) return;'),
  'and the only thing still asking whether the keyboard is open is the key-lighting,'
  + ' after the note has already played');
assert(/const kit = oskKitLanes\(\);/.test(midiBody)
  && !/querySelectorAll\('\.oskpad'\)/.test(midiBody),
  'and a drum arrives off the SONG’s kit rather than off the drawn pads, so General MIDI'
  + ' still lands on the right channel with the window shut');
assert(/function oskTypedKey\(e\) \{\s*if \(!oskCatch \|\| !oskShown\(\)\) return false;/.test(entry),
  'while the COMPUTER keys keep their gate — the desk’s letters are its shortcuts, and'
  + ' oskCatch is the negotiated hand-over');
const showOskBody = /function showOsk\([\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(!/recArmed = false/.test(showOskBody),
  'closing the keyboard no longer disarms: the arm is in the header and closing a window'
  + ' you were not playing with is not a reason to end a take');
// Record belongs WITH the transport, not with the panel toggles on the right: those are
// windows you open, this arms what the transport is about to do. Which side of the
// transport group's closing tag it sits on is a spacing decision and deliberately not
// pinned here — what matters is that it follows the transport and precedes the loop tray,
// rather than living over by A/B and Undo where it started.
{
  const at = (id) => shell.indexOf(`id="${id}"`);
  assert(at('recbtn') > at('pause'),
    'Record comes after Pause — where a record button has been on every deck since tape');
  assert(at('recbtn') < at('looptoggle') && at('recbtn') < at('ab'),
    'and stays on the transport side of the header, not out with the panel toggles');
  assert(at('midibtn') > at('rollbtn'),
    'while MIDI stays over with the panel toggles — it answers which instrument plays the'
    + ' channel, the same question the ⌨ button answers');
}
// Red dot at rest, white dot on red while rolling. The colour is the state.
assert(/\.recicon \.body \{ fill: var\(--hot\); \}/.test(shell),
  'the dot is red at rest — `--hot`, the desk’s own red, defined in all nine themes');
assert(/#recbtn\.live \{[^}]*background: var\(--hot\)/s.test(shell)
  && /#recbtn\.live \.body \{ fill: #fff/.test(shell),
  'and recording is a WHITE dot on a RED button — the one state that must never be'
  + ' mistaken for another');
// The bug in the screenshot: `#midibtn.on { color: var(--accent) }` against
// `button.on { background: var(--accent) }` is teal on teal, and the button lit up as a
// solid block with the socket invisible inside it.
assert(!/#midibtn\.on/.test(shell),
  'MIDI has NO colour rule for its lit state — `button.on` already paints teal and sets'
  + ' `--on-accent` for what is drawn on it, and overriding it was teal-on-teal');
assert(/\.midiicon \.ring \{[^}]*stroke: currentColor/s.test(shell)
  && /\.midiicon \.pin \{[^}]*fill: currentColor/s.test(shell),
  'and the socket is drawn entirely in currentColor, so it inherits that contrast');
assert(/recordFollow\(heardStep\);/.test(entry),
  'and it is driven from the desk’s own playhead, so it sees the same step the line does');

// One clock, hoisted, because two copies drift the moment anybody nudges [ or ].
assert(/function heardStepNow\(\) \{[\s\S]*?phOffset \/ 1000/.test(entry),
  'the heard step is one function, phOffset trim included');
assert(/const heardStep = heardStepNow\(\)/.test(entry),
  'the playhead reads it');
assert(/function recordNote\([\s\S]*?heardStepNow\(\)/.test(entry),
  'and so does the recorder — Audio.step is the scheduler’s FUTURE and carries a cycle'
  + ' offset, so it must never be the thing a note is quantised against');

// Shift is how ⇧R gets through hands that are on the notes.
assert(/function oskTypedKey\(e\) \{[\s\S]{0,400}?if \(e\.shiftKey\) return false;/.test(entry),
  'the keyboard declines everything shifted, which frees the shifted alphabet for good');
const shortcuts = /addEventListener\('keydown', \(e\) => \{[\s\S]*?\n\}\);/.exec(entry)?.[0] || '';
assert(shortcuts.indexOf("e.shiftKey && key === 'r'") > 0
  && shortcuts.indexOf("e.shiftKey && key === 'r'") < shortcuts.indexOf("key === 'r'"),
  '⇧R is tested BEFORE the plain-R reset — this handler lowercases the key and does not'
  + ' look at Shift, so the wrong order resets the channel every time you try to arm');
assert(/if \(recArmed\) \{[\s\S]{0,200}?discardTake\(\)/.test(entry),
  'Escape throws the take away while recording — the gesture you need most and the one'
  + ' there was previously nowhere to put');

// Solo is per-song monitoring, and the desk deliberately keeps it across a mix
// re-apply (reapplySolo). A song switch is the one boundary it must NOT cross: the
// clear has to land before buildRack draws the new S buttons and before
// applyToEngine hands reapplySolo the chance to put it back.
const loadTrackBody = /function loadTrack\(id\) \{[\s\S]*?\n\}/.exec(entry)?.[0] || '';
assert(loadTrackBody.includes('dropSolo()'),
  'opening a song clears solo — it belongs to the mix you left, not the one you opened');
assert(loadTrackBody.indexOf('dropSolo()') < loadTrackBody.indexOf('buildRack()')
  && loadTrackBody.indexOf('dropSolo()') < loadTrackBody.indexOf('applyToEngine('),
  'and clears it before the rack is rebuilt and before reapplySolo could push it back');
assert(/function dropSolo\(\) \{[\s\S]*?soloed\.delete\(key\)[\s\S]*?soloedAux\.delete\(id\)[\s\S]*?\n\}/.test(entry)
  && !/function dropSolo\(\) \{[\s\S]*?\n\}/.exec(entry)[0].includes('toast('),
  'dropSolo empties both solo sets — lanes and sends — and says nothing, because a'
  + ' song switch is not the user clicking S');
assert(/function clearAllSolo\(\) \{[\s\S]*?dropSolo\(\)[\s\S]*?toast\('Solo cleared'\)/.test(entry),
  'while the S button still reports, over the same one implementation');

console.log(failed ? 'MIXER LAYOUT: FAILED' : 'MIXER LAYOUT: OK');
process.exit(failed ? 1 : 0);
