// Contracts about the file-driven visualiser page that hold without a DOM.
//
// There is no browser here, so these are claims about source text — the same
// convention tests/mixer-layout.js uses for the desk, and for the same reason:
// what matters most about this page is not what it renders but which module it
// renders from, and that is provable by reading it.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
}

const entry = read('tools/visualiser-entry.js');
const shell = read('tools/visualiser-shell.html');
const renderVideo = read('tools/render-video.js');
const mixer = read('tools/mixer.js');
const analysis = read('tools/lib/song-analysis.js');
const detect = read('tools/lib/beat-detect.js');
const loudness = read('tools/lib/loudness.js');
const builder = read('tools/build-visualiser.js');
const pkg = JSON.parse(read('package.json'));

// ---- the anti-mirror lock -------------------------------------------------
//
// tools/lib/render-bank.js was DELETED from this repo because a hand-maintained
// reimplementation of the engine drifted from it twice. analyseSong is the same
// kind of thing — a mirror of musicAnalysis() — and the moment a second copy of
// it exists, a rendered clip and this page start disagreeing about what a song
// looks like. There is exactly one, and it lives in tools/lib/song-analysis.js.

assert(/from '\.\/lib\/song-analysis\.js'/.test(renderVideo),
  'render-video.js imports the shared analyser');
assert(!/function analyseSong/.test(renderVideo),
  'render-video.js has no local analyseSong');
assert(!/function fft\b/.test(renderVideo),
  'render-video.js has no local fft');
assert(/analyseSong\(pcm, BPM, percussion, \{[^}]*frames: FRAMES/.test(renderVideo),
  'render-video.js passes frames explicitly rather than letting it be inferred');
assert(/export function analyseSong/.test(analysis) && /export function fft/.test(analysis),
  'song-analysis.js exports both');

// ---- browser-safety, which is what makes the sharing possible -------------

for (const [name, src] of [['song-analysis.js', analysis], ['beat-detect.js', detect], ['loudness.js', loudness]]) {
  const bad = [
    [/from '(node:|fs|path|url)/, 'a node import'],
    [/\brequire\(/, 'a require call'],
    [/\bprocess\./, 'a process reference'],
  ].find(([re]) => re.test(src));
  assert(!bad, `tools/lib/${name} stays browser-safe (no ${bad ? bad[1] : 'node dependency'})`);
}

// ---- the page's own seams -------------------------------------------------

assert(shell.includes('/*__BUNDLE__*/'), 'the shell has a bundle slot');
assert(/fonts\.googleapis\.com/.test(shell),
  'the shell links the game faces — EMERALD CODE RAIN bakes its glyph atlas on first draw');
assert(/document\.fonts\.load/.test(entry) && /await fontsReady/.test(entry),
  'and the entry waits for them before the first frame is drawn');

// The page has TWO sources and they are not symmetrical. An imported file has its
// tempo and its kit hits estimated; one of the game's own banks is rendered by the
// engine itself and needs neither. What has to hold for both is that the PICTURE is
// driven by the precomputed table and never by a live analyser — that is what makes
// the playhead the only clock, and what makes scrubbing possible at all.
assert(/update\(1 \/ FPS/.test(entry),
  'both sources step the preset at a fixed 1/FPS off the audio clock');
assert(/from '\.\.\/src\/engine\/visualisers\.js'/.test(entry),
  'the entry imports the preset pack');

// The bank source PLAYS rather than renders.
//
// Not a preference. `Audio` is a module singleton whose ensure() binds one context
// for its lifetime, so rendering a bank in this document binds it to an
// OfflineAudioContext — and the NEXT render then schedules into the first one's
// finished graph and comes back silent. Measured, before this was live: song one
// peaked 0.907, song two peaked exactly 0. The desk pays for a hidden iframe per
// render to avoid this; a page that plays needs no render at all.
assert(!/renderBankPage/.test(entry),
  'a game song is not rendered in this document — see the singleton note above');
assert(/Audio\.setBank\(bank, mix, arrangement\)/.test(entry),
  'it is played on the engine\'s own sequencer, the ordinary game path');
assert(/Audio\.musicAnalysis\(\)/.test(entry),
  'and its analysis is read live, so beat and kit hits are the sequencer\'s own');
assert(/bpmOf\(bank, trackId, arrangement/.test(entry),
  'reported at the tempo it is PLAYED at, so a retuned song reads right');

// A SAVED COPY keeps its tempo and its mix in its OWN file.
//
// src/data/imported/index.js forwards { bank, title, group, writable } to
// registerTrack and nothing else, so a song's `mix` and `arrangement` never reach
// the registry — and a copy's arrangement is where a desk retune lives. Looked up
// through resolveTrack, shoppingchannel played at its bank's 120 instead of the 80
// its arrangement asks for, with none of its mix. Importing the module is what
// fixes it, so both halves are pinned here.
assert(/import \* as [A-Z_]+ from '\.\.\/src\/data\/imported\//.test(entry),
  'a saved copy is imported as a module, not resolved through the registry');
assert(/entry\.song \? entry\.song\.mix : undefined/.test(entry)
  && /entry\.song \? entry\.song\.arrangement : undefined/.test(entry),
  'and hands the engine its own mix and arrangement, while a built-in hands neither');
// Matched as an import rather than as a path, because the comment above the real
// import explains why the index is NOT used and would otherwise trip this.
assert(!/^import [^\n]*imported\/index\.js'/m.test(entry),
  'without pulling the whole imported index — that is ~120 banks of bundle for one song');
assert(/exact: true/.test(entry),
  'its grid is marked exact — it came from the sequencer, so nothing about it is a guess');
assert(/from '\.\/lib\/song-analysis\.js'/.test(entry),
  'the entry uses the shared analyser rather than its own');
assert(/from '\.\/lib\/beat-detect\.js'/.test(entry),
  'the entry uses the shared detector');

// The precomputed-table design has exactly two ways to go wrong, and both are
// one line each.
assert(/outputLatency \|\| ctx\.baseLatency/.test(entry),
  'the playhead corrects for output latency, as songBeat() does — without it the '
  + 'picture runs a fifth of a second ahead of the music on Bluetooth');
assert(/update\(1 \/ FPS/.test(entry) && !/update\(dt/.test(entry),
  'update() is stepped at a fixed 1/FPS, never a wall-clock delta: the presets '
  + 'integrate, so a variable dt would diverge from what render-video draws');

assert(/const FPS = 60/.test(entry), 'the analysis table is a fixed 60Hz');
assert(/Audio\.setSampleRate\(SAMPLE_RATE\)/.test(entry) && /const SAMPLE_RATE = 44100/.test(entry),
  'the context is asked for at 44.1kHz before ensure(), or every band bin edge shifts');
assert(entry.indexOf('Audio.setSampleRate') < entry.indexOf('Audio.ensure()'),
  'and asked BEFORE ensure(), which binds the context for the module\'s lifetime');

// Seeking cannot just move the audio: every preset is a forward integration and
// ringRotationAt() generates its event list forward from beat 0.
assert(/function seek\(seconds\)[\s\S]*?rebuildPreset\(\)/.test(entry),
  'seek rebuilds the preset');
assert(/function rebuildPreset\(\)[\s\S]*?for \(let k = 0; k <= target; k\+\+\) view\.preset\.update/.test(entry),
  'and rebuildPreset replays update() up to the playhead');

// ---- serving --------------------------------------------------------------

assert(/buildVisualiserPage/.test(mixer), 'the mixer server can build the page');
// Both spellings: the desk's own code says "visualiser" and the preset pack says
// "visualiser", so whichever one is in your fingers has to answer.
const route = /\/\^\\\/visuali\[sz\]er\\\/\?/.test(mixer);
assert(route, 'and routes both /visualiser and /visualiser to it');
assert(/visualiser-shell\.html/.test(builder) && /visualiser-entry\.js/.test(builder),
  'from the shell and the entry');
assert(pkg.scripts.visualiser === 'node tools/build-visualiser.js',
  'package.json carries the standalone build script');
assert(/dist\/visualiser\.html/.test(builder) && /__BUNDLE__/.test(builder),
  'which inlines the bundle into dist/visualiser.html');
assert(/buildVisualiserHtml\(ROOT\)/.test(mixer),
  'and the server builds the page with that same function, so the served page and '
  + 'the built one cannot disagree about what is in the bundle');

// ---- no MASHENSTEIN characters in this page -------------------------------
//
// Two halves, and BOTH are needed. src/engine/visualisers.js imports the sprite
// modules at module scope, so declining to offer the two presets that draw the
// cast still ships every hero painter; and stripping the modules without also
// withdrawing the presets leaves the pack able to deal something it cannot draw.

assert(/sprites\[\/\\\\\]\(toons\|props\)\\\.js\$/.test(builder),
  'the build resolves the sprite modules away, matched on the resolved path rather '
  + 'than the import specifier — the same module is reachable by several of those');
assert(/no-sprites\.js/.test(builder), 'to the stub in tools/lib/');
const stub = read('tools/lib/no-sprites.js');
assert(/throw new Error/.test(stub),
  'and the stub throws rather than drawing nothing: a silently blank frame is the '
  + 'version of this bug that ships');
assert(/setExcludedVisualisers\(SPRITE_VISUALISERS\)/.test(entry),
  'the entry withdraws the sprite presets from every path that deals one');
assert(/OFFERED_INDICES/.test(entry) && !/\[\.\.\.VISUALISER_NAMES\.map/.test(entry),
  'and the picker is built from the offered list rather than the whole pack');

// ---- the withdrawal actually works ---------------------------------------

const { installDom } = await import('./dom-stub.js');
installDom();
const vis = await import('../src/engine/visualisers.js');
{
  const banned = vis.SPRITE_VISUALISERS.map((n) => vis.VISUALISER_NAMES.indexOf(n));
  assert(banned.every((i) => i >= 0), 'SPRITE_VISUALISERS names presets that exist');

  vis.setExcludedVisualisers(vis.SPRITE_VISUALISERS);
  assert(banned.every((i) => vis.isVisualiserExcluded(i)), 'and they report as excluded');

  // pickVisualiser is the jukebox's shuffle. Walk it hard rather than sampling.
  let picked = new Set();
  for (let i = 0; i < 4000; i++) picked.add(vis.pickVisualiser(-1, () => (i * 0.6180339887) % 1));
  assert(![...picked].some((i) => banned.includes(i)),
    `the shuffle never returns one (saw ${picked.size} distinct presets)`);

  // VJ MEGAMIX deals from a shuffled deck of the whole pack, so it is the path
  // most likely to reach a preset nobody chose. Drain many full decks.
  const mix = vis.createVisualiser('VJ MEGAMIX', 0x51ee7, { bpm: 120 });
  const dealt = new Set();
  for (let i = 0; i < 500; i++) dealt.add(mix.takeNextIndex());
  assert(dealt.size > 10, `the deck really is dealing (${dealt.size} distinct)`);
  assert(![...dealt].some((i) => banned.includes(i)),
    'and the megamix deck never deals one either');

  // createVisualiser stays a plain lookup on purpose: the game's dev menu
  // addresses presets by index, and an excluded one silently becoming its
  // neighbour would be worse than it being unreachable.
  const still = vis.createVisualiser(banned[0], 1, { bpm: 120 });
  assert(still.name === vis.VISUALISER_NAMES[banned[0]],
    'while createVisualiser by index is unchanged — exclusion governs dealing, not building');

  vis.setExcludedVisualisers([]);
  assert(!banned.some((i) => vis.isVisualiserExcluded(i)),
    'and the exclusion clears again, so the game keeps its full pack');
}

process.exit(failed ? 1 : 0);
