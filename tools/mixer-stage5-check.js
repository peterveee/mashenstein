// Isolated Stage 5 checks. Default: stopped-song correctness only, muted audio.
// --playback adds a bounded playback/drag probe; reserve comparisons for a quiet window.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const playback = args.includes('--playback');
const extended = args.includes('--extended');
const interactions = args.includes('--interactions');
const traceUi = args.includes('--trace-ui');
const profileUi = args.includes('--profile-ui') || traceUi;
assert.ok(!interactions || playback, '--interactions requires --playback');
const instrumented = !args.includes('--no-diagnostics');
const song = option('song', 'hub');
const seconds = Number(option('seconds', '30'));
assert.ok(Number.isFinite(seconds) && seconds >= 1 && seconds <= 60, 'seconds must be 1–60');
const entryRef = option('entry-ref', '');
assert.ok(!entryRef || playback, '--entry-ref is for playback comparisons, not fixed-code correctness');
const root = resolve(import.meta.dirname, '..');
const outDir = resolve(option('out', join(root, 'work/audit/mixer-responsiveness/stage5-latest')));
mkdirSync(outDir, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const entryPath = join(root, 'tools/mixer-entry.js');
const entry = option('entry-file', '') ? readFileSync(resolve(option('entry-file')), 'utf8') : entryRef ? execFileSync('git', ['show', `${entryRef}:tools/mixer-entry.js`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 }) : readFileSync(entryPath, 'utf8');
const fixtures = { hub: 'src/data/songs/hub.js', megamix: 'src/data/songs/megamix.js', 'super-mario-world': 'src/data/imported/super-mario-world.js' };
assert.ok(fixtures[song], 'use hub, megamix or super-mario-world');
let fixture;
if (option('fixture', '')) fixture = JSON.parse(readFileSync(resolve(option('fixture')), 'utf8'));
else {
  fixture = { mix: {}, arrangements: {}, m8trx: {} };
  for (const [id, file] of Object.entries(fixtures)) {
    const data = await import(pathToFileURL(join(root, file)));
    fixture.mix[id] = data.mix ?? null;
    fixture.arrangements[id] = data.arrangement ?? null;
    fixture.m8trx[id] = data.m8trx ?? null;
  }
}
const fixtureJson = JSON.stringify(fixture);
writeFileSync(join(outDir, 'fixture.json'), fixtureJson);
const hooks = `
import { createEditDiagnostics } from './lib/mixer-edit-diagnostics.js';
const stage5Diag = createEditDiagnostics({ enabled: ${instrumented} });
applyToEngine = stage5Diag.wrap('desk.applyToEngine', applyToEngine);
rebank = stage5Diag.wrap('desk.rebank', rebank);
buildRack = stage5Diag.wrap('ui.buildRack', buildRack);
buildArrangement = stage5Diag.wrap('ui.buildArrangement', buildArrangement);
buildDevices = stage5Diag.wrap('ui.buildDevices', buildDevices);
syncChannelMixControls = stage5Diag.wrap('ui.syncChannelMixControls', syncChannelMixControls);
if (typeof flushChannelMixControls === 'function') flushChannelMixControls = stage5Diag.wrap('ui.flushChannelMixControls', flushChannelMixControls);
setEffects = stage5Diag.wrap('desk.setEffects', setEffects);
applyArrangementEdit = stage5Diag.wrap('desk.applyArrangementEdit', applyArrangementEdit);
for (const method of ['applyMix', '_mixToGraph', 'reapplyBank', 'setArrangement']) {
  Audio[method] = stage5Diag.wrap('audio.' + method, Audio[method]);
}
let stage5Mixer = null;
window.__stage5 = {
  installGraphProbe() {
    if (stage5Mixer === Audio.mixer || !Audio.mixer) return;
    stage5Mixer = Audio.mixer;
    stage5Mixer.reset = stage5Diag.wrap('graph.reset', stage5Mixer.reset);
  },
  reset: stage5Diag.reset,
  snapshot: stage5Diag.snapshot,
  health: () => perfDiag.snapshot(),
  state: () => ({ trackId, playing, selectedLane, arrangement: arrFor(trackId) ?? null,
    mix: mixFor(trackId), bars: arrDraftOf().plan.length,
    strips: document.querySelectorAll('.strip').length }),
  selectSong, openChannelEffects, buildDevices, undo,
  selection: () => selectedBar,
  rememberRack() { window.__stage5Rack = [...document.querySelectorAll('.strip[data-lane], .strip .fader, .strip .meter')]; },
  rackRetained() { return window.__stage5Rack.every(node => node.isConnected); },
  slotState(key) { const block = document.querySelector('.strip[data-lane="' + CSS.escape(key) + '"] .fxbtns'); return block ? { buttons: block.querySelectorAll('button:not(.addslot)').length, reserved: block.style.getPropertyValue('--fxrowsh'), own: block.style.getPropertyValue('--fxownh'), master: block.classList.contains('master-fxbtns') } : null; },
  rememberGrid() { window.__stage5Grid = [...document.querySelectorAll('#arrgrid .arrrow')]; },
  gridRetained() { return window.__stage5Grid.every(row => row.isConnected) && window.__stage5Grid.length === document.querySelectorAll('#arrgrid .arrrow').length; },
  effectShortcut(key) { return !!document.querySelector('#arrgrid .arrrow[data-lane="' + CSS.escape(key) + '"] .arrfxdot'); },
  pick: (key, id) => setLaneVoice(key, id, { autoCopy: false }),
  voice: key => laneVoiceId(key),
  workletChoices: () => ['TNGR-2', 'MRDR-3', 'FRPP-6'].map(synth => {
    const voice = Object.values(VOICES).find(v => v.synth === synth && !v.songLocal);
    if (!voice) throw Error('No preset for ' + synth);
    return { id: voice.id, synth };
  }),
  livePan: key => Audio.mixer?.lane(key)?.state.pan,
  undoOutput() {
    const strip = Audio.mixer.lane('bass'), gain = strip.setGain, pan = strip.setPan;
    const chain = [...liveChain('bass')];
    let gainCalls = 0, panCalls = 0;
    strip.setGain = function (...args) { gainCalls++; return gain.apply(this, args); };
    strip.setPan = function (...args) { panCalls++; return pan.apply(this, args); };
    try { undo(); return { gainCalls, panCalls, gain: strip.state.gain, pan: strip.state.pan,
      chainPreserved: chain.length === liveChain('bass').length && chain.every((link, i) => link === liveChain('bass')[i]) }; }
    finally { strip.setGain = gain; strip.setPan = pan; }
  },
  closePanel: () => setDevicesFolded(true),
  openVoice: key => editVoice(key, { advanced: false }),
  closeVoice: () => dismissVoiceEditor(),
  exerciseVoiceEdit() {
    const before = structuredClone(voiceEditor.voice);
    const control = voiceEditEl.querySelector('input[type="range"]');
    if (!control) throw Error('No editable preset control');
    control.value = +control.value > 0.7 ? '0.3' : '0.8';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    const after = structuredClone(voiceEditor.voice);
    const storedAfter = structuredClone(mixFor(trackId).voiceParams.bassVoice);
    const button = voiceEditEl.querySelector('.veundo');
    if (!button || button.disabled) throw Error('Preset edit did not enable undo');
    button.click();
    return { before, after, storedAfter, undone: structuredClone(voiceEditor.voice),
      storedUndone: structuredClone(mixFor(trackId).voiceParams.bassVoice) };
  },
  editor: () => ({ open: voiceEditor.isOpen(), id: voiceEditor.editing, voice: voiceEditor.voice,
    controls: [...voiceEditEl.querySelectorAll('input')].map(el => ({ type: el.type, name: el.getAttribute('aria-label'), value: el.value, min: el.min, max: el.max })) }),
  resources: () => ({ adjustCallbacks: channelAdjustDisposers.size, syncerKeys: channelMixSyncers.size,
    inspectorMeters: meters.filter(m => m.inspector).length,
    pendingVoices: pendingLaneVoices.size, pendingMirrors: pendingChannelMixSync.size }),
  effectState: key => ({ stored: effectsOf(key), liveCount: liveChain(key)?.length ?? 0, off: effectsOf(key).map(effectOff) }),
  maxEffects: MAX_EFFECTS,
  slotLayout: () => [...document.querySelectorAll('#rack .strip[data-lane]')].map(strip => ({ key: strip.dataset.lane, count: effectsOf(strip.dataset.lane).length, reserved: strip.querySelector('.fxbtns')?.style.getPropertyValue('--fxrowsh') })),
  toggleSlot(key) { document.querySelector('.strip[data-lane="' + CSS.escape(key) + '"] .fxbtns .pwrhit').click(); },
  groupTarget() {
    const group = activeGroups()[0] || GROUP_BUSES[0];
    if (!activeGroups().length) setLaneRoute('bass', group.id);
    return groupKey(group.id);
  },
  deferWarmups() {
    const original = Audio.warmLaneVoice;
    const waits = [];
    Audio.warmLaneVoice = (lane, voice) => new Promise(resolve => waits.push({ lane, voice, resolve }));
    return window.__stage5Warm = { resolve: i => waits[i].resolve(), count: () => waits.length,
      restore: () => { Audio.warmLaneVoice = original; for (const wait of waits) wait.resolve(); } };
  },
  paste(key, list) { clipboard = { data: { effects: list } }; pasteEffects(key); },
  copyVoice(key) { return saveVoiceToSong(key, structuredClone(presetForLane(key))); },
  stop() { setPlaying(false); },
};
`;
const bundle = await build({ entryPoints: [entryPath], bundle: true, format: 'iife', target: ['es2020'],
  metafile: true, minify: false, write: false, logLevel: 'warning', outdir: join(root, 'dist'),
  plugins: [{ name: 'stage5-only-hooks', setup(builder) {
    if (option('scroll-file', '')) builder.onLoad({ filter: /\/tools\/mixer-scroll\.js$/ }, () => ({ contents: readFileSync(resolve(option('scroll-file')), 'utf8'), loader: 'js' }));
    builder.onLoad({ filter: /\/tools\/mixer-entry\.js$/ }, () => ({ contents: entry + hooks, loader: 'js' }));
  } }],
});
const js = bundle.outputFiles[0].text;
const html = readFileSync(option('shell-file', '') ? resolve(option('shell-file')) : join(root, 'tools/mixer-shell.html'), 'utf8')
  .replaceAll('/*__MIXER_BRAND__*/', 'TRK-24').replace('/*__MIXER_DEV_USER__*/', 'true')
  .replace('<script>/*__BUNDLE__*/</script>', '<script src="/bundle.js"></script>');
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  entryRef: option('entry-file', '') || entryRef || 'working tree', scrollSource: option('scroll-file', '') || 'working tree', entryHash: hash(entry), bundleHash: hash(js), fixtureHash: hash(fixtureJson),
  dependencyHash: hash(JSON.stringify(Object.keys(bundle.metafile.inputs).filter(p => p !== 'tools/mixer-entry.js').sort().map(p => [p, hash(readFileSync(p === 'tools/mixer-scroll.js' && option('scroll-file', '') ? resolve(option('scroll-file')) : join(root, p)))]))),
  shellHash: hash(html), shellSource: option('shell-file', '') || 'working tree',
  instrumented, playback, extended, interactions, seconds, song, viewport: { width: 1440, height: 900 },
  caveat: 'Synchronous timings only; not heard latency. Non-quiet results are exploratory. No production diagnostics are installed.',
  suppressedDiagnosticWrites: 0, checks: [], scenarios: [], pageErrors: [], blockedWrites: [], unknownRoutes: [], started: new Date().toISOString() };
let browser, context, page, server, profiler;
let profileBefore;
const profileStart = async () => {
  if (!profileUi) return;
  profileBefore = Object.fromEntries((await profiler.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  if (traceUi) await profiler.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReturnAsStream' });
  else await profiler.send('Profiler.start');
};
const profileEnd = async name => {
  if (!profileUi) return null;
  if (traceUi) {
    const complete = new Promise(resolve => profiler.once('Tracing.tracingComplete', resolve));
    await profiler.send('Tracing.end');
    const { stream } = await complete;
    let trace = '';
    while (true) { const part = await profiler.send('IO.read', { handle: stream }); trace += part.data; if (part.eof) break; }
    await profiler.send('IO.close', { handle: stream });
    writeFileSync(join(outDir, name.replaceAll(' ', '-') + '.trace.json'), trace);
  } else {
    const { profile } = await profiler.send('Profiler.stop');
    writeFileSync(join(outDir, name.replaceAll(' ', '-') + '.cpuprofile'), JSON.stringify(profile));
  }
  const now = (await profiler.send('Performance.getMetrics')).metrics;
  return Object.fromEntries(now.filter(m => ['LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration','LayoutCount','RecalcStyleCount'].includes(m.name)).map(m => [m.name, m.value - profileBefore[m.name]]));
};
let origin;
try {
  server = createServer((request, response) => {
    if (request.method !== 'GET' || !['/', '/bundle.js'].includes(request.url)) {
      response.writeHead(404); response.end(); return;
    }
    response.setHeader('Content-Type', request.url === '/' ? 'text/html' : 'text/javascript');
    response.end(request.url === '/' ? html : js);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Built ${Math.round(js.length / 1048576)} MiB isolated bundle; launching browser`);
  browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: report.viewport, serviceWorkers: 'block' });
  await context.addInitScript(id => {
    localStorage.setItem('mash-mixer-song', id);
    localStorage.setItem('mash-mixer-tutorial-seen', '1');
  }, song);
  // Only this read-only fixture server is reachable. Writes never reach a server.
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname === '/diagnostics-log') {
      report.suppressedDiagnosticWrites++;
      return route.fulfill({ status: 200, body: 'ok' });
    }
    if (request.method() !== 'GET') {
      report.blockedWrites.push({ method: request.method(), path: url.pathname });
      return route.abort();
    }
    if (url.origin === origin && ['/', '/bundle.js'].includes(url.pathname)) return route.continue();
    if (url.pathname === '/mix') {
      // Deliberately leave the old panel mounted beyond its 150 ms edit debounce.
      // Song-switch correctness must not depend on a fast file read.
      if (url.searchParams.get('track') === 'megamix') await new Promise(resolve => setTimeout(resolve, 400));
      return route.fulfill({ contentType: 'application/json', body: fixtureJson });
    }
    if (!report.unknownRoutes.includes(url.pathname)) report.unknownRoutes.push(url.pathname);
    return route.fulfill({ status: 404, body: 'Isolated audit: no such resource' });
  });
  page = await context.newPage();
  if (profileUi) { profiler = await context.newCDPSession(page); await profiler.send('Performance.enable'); await profiler.send('Profiler.enable'); }
  page.on('pageerror', error => { if (report.pageErrors.length < 30) report.pageErrors.push(error.message); });
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__stage5 && document.querySelector('#loadprogress')?.hidden === true, null, { timeout: 60000 });
  await page.evaluate(() => { window.__stage5.installGraphProbe(); window.__stage5.openChannelEffects('bass'); });
  if (option('ui-css', '')) {
    const css = readFileSync(resolve(option('ui-css')), 'utf8');
    report.experimentalCssHash = hash(css);
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(600);
  }
  report.initial = await page.evaluate(() => ({ ...window.__stage5.state(), health: window.__stage5.health(), userAgent: navigator.userAgent }));
  assert.equal(report.initial.trackId, song);
  const counts = () => page.evaluate(() => window.__stage5.snapshot());
  const reset = () => page.evaluate(() => window.__stage5.reset());
  const noGraphReset = metrics => {
    if (!instrumented || entryRef) return;
    assert.equal(metrics['graph.reset'].count, 0);
    assert.equal(metrics['audio.applyMix'].count, 0);
  };
  const inputScript = value => {
    const input = document.querySelector('.devadjust input[aria-label="transpose"]');
    if (!input) throw Error('Modify Track transpose missing');
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  if (!playback) {
    await reset();
    await page.evaluate(inputScript, 2);
    await page.waitForFunction(() => window.__stage5.snapshot()['desk.applyArrangementEdit']?.count === 1 || !window.__stage5.snapshot()['desk.applyArrangementEdit']);
    await page.waitForTimeout(250);
    const changed = await page.evaluate(() => window.__stage5.state().arrangement);
    assert.notDeepEqual(changed, report.initial.arrangement);
    report.checks.push('ordinary delayed Modify Track edit applies');
    await page.evaluate(() => window.__stage5.undo());
    await reset();
    await page.evaluate(() => {
      const input = document.querySelector('.devadjust input[aria-label="transpose"]');
      input.value = '5'; input.dispatchEvent(new Event('input', { bubbles: true }));
      window.__stage5.buildDevices();
    });
    await page.waitForTimeout(300);
    if (instrumented) assert.equal((await counts())['desk.applyArrangementEdit'].count, 0);
    report.checks.push('panel replacement cancels pending edit');
    await reset();
    await page.evaluate(() => {
      const input = document.querySelector('.devadjust input[aria-label="transpose"]');
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      input.value = '3'; input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (instrumented) assert.equal((await counts())['desk.applyArrangementEdit'].count, 1);
    await page.evaluate(() => window.__stage5.undo());
    report.checks.push('interrupted range gesture commits once and remains undoable');
    await reset();
    const beforeSwitch = await page.evaluate(() => window.__stage5.state().arrangement);
    await page.evaluate(async () => {
      const input = document.querySelector('.devadjust input[aria-label="transpose"]');
      input.value = '7'; input.dispatchEvent(new Event('input', { bubbles: true }));
      await window.__stage5.selectSong('megamix');
    });
    await page.waitForTimeout(300);
    const switched = await page.evaluate(() => window.__stage5.state());
    assert.equal(switched.trackId, 'megamix');
    assert.deepEqual(switched.arrangement, fixture.arrangements.megamix);
    await page.evaluate(id => window.__stage5.selectSong(id), song);
    assert.deepEqual(await page.evaluate(() => window.__stage5.state().arrangement), beforeSwitch);
    report.checks.push('pending edit does not migrate to another song or survive return');
    await page.evaluate(() => window.__stage5.openChannelEffects('bass'));
    await reset();
    await page.evaluate(() => window.__stage5.paste('bass', [{ id: 'gain', params: { gain: -3 } }]));
    const paste = await counts(); noGraphReset(paste);
    if (instrumented) assert.equal(paste['ui.buildDevices'].count, 1, 'effect paste builds the selected panel once');
    report.scenarios.push({ name: 'stopped effect paste', metrics: paste });
    report.checks.push('effect paste avoids full mix apply and graph reset, with one panel build');
    await reset();
    await page.evaluate(() => window.__stage5.copyVoice('bass'));
    if (instrumented) assert.equal((await counts())['audio.applyMix'].count, 1);
    report.checks.push('stopped voice copy refreshes audition bank');
  }
  if (extended && !playback) {
    const group = await page.evaluate(() => window.__stage5.groupTarget());
    for (const key of ['bass', group, '__aux:reverb', '__master']) {
      await page.evaluate(key => window.__stage5.openChannelEffects(key), key);
      const original = await page.evaluate(key => window.__stage5.effectState(key), key);
      await reset();
      await page.evaluate(() => window.__stage5.rememberRack());
      await page.evaluate(key => window.__stage5.paste(key, [{ id: 'gain', params: { gain: -4 } }]), key);
      const pasted = await page.evaluate(key => window.__stage5.effectState(key), key);
      assert.deepEqual(pasted.stored, [{ id: 'gain', params: { gain: -4 } }]);
      assert.equal(pasted.liveCount, 1);
      assert.equal(await page.evaluate(() => window.__stage5.rackRetained()), true);
      assert.equal((await page.evaluate(key => window.__stage5.slotState(key), key)).buttons, 1);
      await page.evaluate(key => window.__stage5.toggleSlot(key), key);
      assert.equal((await page.evaluate(key => window.__stage5.effectState(key), key)).off[0], true);
      await page.evaluate(key => window.__stage5.toggleSlot(key), key);
      assert.equal((await page.evaluate(key => window.__stage5.effectState(key), key)).off[0], false);
      assert.equal(await page.evaluate(() => window.__stage5.rackRetained()), true);
      noGraphReset(await counts());
      await page.evaluate(() => { window.__stage5.undo(); window.__stage5.undo(); });
      await page.evaluate(() => window.__stage5.undo());
      assert.deepEqual((await page.evaluate(key => window.__stage5.effectState(key), key)).stored, original.stored);
      await page.evaluate(key => window.__stage5.paste(key, []), key);
      const cleared = await page.evaluate(key => window.__stage5.effectState(key), key);
      assert.deepEqual(cleared.stored, []); assert.equal(cleared.liveCount, 0);
      assert.equal((await page.evaluate(key => window.__stage5.slotState(key), key)).buttons, 0);
      if (key === 'bass' || key === group) assert.equal(await page.evaluate(key => window.__stage5.effectShortcut(key), key), false);
      await page.evaluate(() => window.__stage5.undo());
      assert.deepEqual((await page.evaluate(key => window.__stage5.effectState(key), key)).stored, original.stored);
      if (key === 'bass' || key === group) assert.equal(await page.evaluate(key => window.__stage5.effectShortcut(key), key), original.stored.length > 0);
      report.checks.push('paste / clear / undo: ' + key);
    }
    await page.evaluate(() => window.__stage5.openChannelEffects('bass'));
    for (const count of [6, 0]) {
      await page.evaluate(count => window.__stage5.paste('bass', Array.from({ length: count }, () => ({ id: 'gain', params: { gain: -1 } }))), count);
      const layout = await page.evaluate(() => window.__stage5.slotLayout());
      const limit = await page.evaluate(() => window.__stage5.maxEffects);
      const height = Math.min(limit, Math.max(...layout.map(s => s.count)) + 1) * 29 - 4;
      assert.ok(layout.every(slot => slot.reserved === height + 'px'), 'all insert reservations follow the longest visible chain');
      assert.equal((await page.evaluate(() => window.__stage5.slotState('bass'))).buttons, count);
      await page.evaluate(() => window.__stage5.undo());
    }
    report.checks.push('targeted insert paste/bypass/clear keeps controls mounted and longest-chain spacing aligned');
    const originalVoice = await page.evaluate(() => window.__stage5.voice('bass'));
    await page.evaluate(() => window.__stage5.pick('bass', 'toneSine'));
    assert.equal(await page.evaluate(() => window.__stage5.voice('bass')), 'toneSine');
    await page.evaluate(() => window.__stage5.undo());
    assert.equal(await page.evaluate(() => window.__stage5.voice('bass')), originalVoice);
    report.checks.push('preset choice and undo restore the original voice');
    const cdp = await context.newCDPSession(page);
    const listenerCount = async () => (await cdp.send('Runtime.evaluate', {
      expression: "({ dragover: (getEventListeners(document.getElementById('devrack')).dragover || []).length, mouseup: (getEventListeners(window).mouseup || []).length })",
      includeCommandLineAPI: true, returnByValue: true,
    })).result.value;
    await page.evaluate(() => window.__stage5.paste('bass', [{ id: 'gain', params: { gain: -3 } }]));
    const before = { listeners: await listenerCount(), resources: await page.evaluate(() => window.__stage5.resources()) };
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => { window.__stage5.closePanel(); window.__stage5.openChannelEffects('bass'); });
    }
    const after = { listeners: await listenerCount(), resources: await page.evaluate(() => window.__stage5.resources()) };
    report.cleanup = { before, after };
    assert.deepEqual(after.listeners, before.listeners, 'panel rebuilds must not accumulate dragover or mouseup listeners');
    assert.deepEqual(after.resources, before.resources, 'panel-owned references remain bounded');
    await page.evaluate(() => document.querySelector('#devrack .device .devbar').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    const armed = await listenerCount();
    assert.equal(armed.mouseup, after.listeners.mouseup + 1);
    await page.evaluate(() => window.__stage5.buildDevices());
    assert.deepEqual(await listenerCount(), after.listeners, 'panel rebuild cancels the armed drag listener');
    for (let i = 0; i < 2; i++) {
      const released = await page.evaluate(() => {
        const card = document.querySelector('#devrack .device');
        card.querySelector('.devbar').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup'));
        return card.draggable;
      });
      assert.equal(released, false, 'each repeated drag releases, not just the first');
    }
    await cdp.detach();
    report.checks.push('twelve panel close/open cycles retain bounded callbacks, syncers, meters and listeners');
    await reset();
    report.mirrorBurst = await page.evaluate(async () => {
      const input = document.querySelector('#devmix input[aria-label="Channel pan"]');
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      for (let i = 1; i <= 20; i++) {
        input.value = String(i / 100);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const immediate = { model: window.__stage5.state().mix.lanes.bass.pan,
        audio: window.__stage5.livePan('bass'), input: +input.value,
        flushes: window.__stage5.snapshot()['ui.flushChannelMixControls']?.count };
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { immediate, metrics: window.__stage5.snapshot(),
        stripPan: document.querySelector('.strip[data-lane="bass"] .pottext').textContent,
        resources: window.__stage5.resources() };
    });
    assert.equal(report.mirrorBurst.immediate.model, 0.2);
    assert.equal(report.mirrorBurst.immediate.audio, 0.2);
    assert.equal(report.mirrorBurst.immediate.input, 0.2);
    assert.equal(report.mirrorBurst.stripPan, '+20');
    if (instrumented) {
      assert.equal(report.mirrorBurst.immediate.flushes, 0);
      assert.equal(report.mirrorBurst.metrics['ui.flushChannelMixControls'].count, 1);
    }
    assert.equal(report.mirrorBurst.resources.pendingMirrors, 0);
    report.checks.push('twenty synchronous pan inputs keep audio immediate, flush mirrors once and update the rack pan');
  }
  // Bounded input probe. It uses real input handlers; synthetic events are not physical drag latency.
  if (playback) {
    await page.locator('#play').click();
    await page.waitForFunction(() => window.__stage5.state().playing, null, { timeout: 30000 });
    await page.waitForTimeout(2000);
  }
  await page.evaluate(() => window.__stage5.openChannelEffects('bass'));
  await reset();
  report.scenarios.push(await page.evaluate(async ({ playback, seconds }) => {
    const input = document.querySelector('#devmix input[aria-label="Channel pan"]');
    if (!input) throw Error('Channel pan missing');
    const frames = [], longTasks = [], health = [], inputMs = [];
    let lastHealth = 0;
    let previous = 0, frameId, active = true, observer;
    const frame = at => {
      if (!active) return;
      if (previous && frames.length < 4096) frames.push(at - previous);
      previous = at; frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (longTasks.length < 256) longTasks.push({ start: entry.startTime, ms: entry.duration });
      });
      observer.observe({ type: 'longtask' });
    }
    const before = window.__stage5.health(), initialPan = input.value;
    const start = performance.now();
    try {
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      const count = playback ? 150 : 20;
      for (let i = 0; i < count; i++) {
        input.value = String(-0.5 + i / count);
        const inputStart = performance.now();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        inputMs.push(performance.now() - inputStart);
        if (performance.now() - lastHealth >= 1000) { health.push(window.__stage5.health()); lastHealth = performance.now(); }
        await new Promise(resolve => setTimeout(resolve, playback ? 33 : 5));
      }
      input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      while (playback && performance.now() - start < seconds * 1000) {
        health.push(window.__stage5.health());
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { name: 'channel pan gesture', count, initialPan, finalPan: input.value,
        mixPanAfter: window.__stage5.state().mix.lanes?.bass?.pan,
        elapsedMs: performance.now() - start, metrics: window.__stage5.snapshot(),
        before, after: window.__stage5.health(), health, frames, longTasks, inputMs };
    } finally { active = false; cancelAnimationFrame(frameId); observer?.disconnect(); }
  }, { playback, seconds }));
  noGraphReset(report.scenarios.at(-1).metrics);
  assert.equal(report.scenarios.at(-1).mixPanAfter, Number(report.scenarios.at(-1).finalPan));
  if (playback && interactions) {
    await reset();
    const before = await page.evaluate(() => window.__stage5.health());
    const output = await page.evaluate(() => window.__stage5.undoOutput());
    report.panUndo = { metrics: await counts(), before, output,
      after: await page.evaluate(() => window.__stage5.health()),
      pan: await page.evaluate(() => window.__stage5.livePan('bass')) };
    assert.equal(report.panUndo.pan, Number(report.scenarios[0].initialPan));
    noGraphReset(report.panUndo.metrics);
    assert.equal(output.gainCalls, 0); assert.equal(output.panCalls, 1);
    assert.equal(output.chainPreserved, true);
    const originalGain = output.gain;
    await page.evaluate(() => {
      const input = document.querySelector('#devmix input[aria-label="Channel output level"]');
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      input.value = '0.2'; input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await reset();
    report.gainUndo = { output: await page.evaluate(() => window.__stage5.undoOutput()), metrics: await counts() };
    noGraphReset(report.gainUndo.metrics);
    assert.equal(report.gainUndo.output.gain, originalGain);
    assert.equal(report.gainUndo.output.gainCalls, 1); assert.equal(report.gainUndo.output.panCalls, 0);
    assert.equal(report.gainUndo.output.chainPreserved, true);
    report.checks.push('gain and pan undo retain effect links, avoid graph resets, and touch only the edited parameter');
  }
  if (playback) {
    for (const action of ['paste', 'copyVoice']) {
      await reset();
      const before = await page.evaluate(() => window.__stage5.health());
      await profileStart();
      await page.evaluate(() => { window.__stage5.rememberGrid(); window.__stage5.rememberRack(); });
      await page.evaluate(action => {
        if (action === 'paste') window.__stage5.paste('bass', [{ id: 'gain', params: { gain: -3 } }]);
        else window.__stage5.copyVoice('bass');
      }, action);
      const metrics = await counts(); noGraphReset(metrics);
      const rackRetained = await page.evaluate(() => window.__stage5.rackRetained());
      const gridRetained = await page.evaluate(() => window.__stage5.gridRetained());
      if (action === 'paste' && !entryRef && !option('entry-file', '')) {
        assert.equal(gridRetained, true, 'effect paste preserves the arrangement nodes');
        assert.equal(rackRetained, true, 'effect paste preserves strips, faders and meters');
        assert.equal(await page.evaluate(() => window.__stage5.effectShortcut('bass')), true);
      }
      report.scenarios.push({ name: 'playing ' + action, metrics, before, gridRetained, rackRetained, profile: await profileEnd(action),
        health: await page.evaluate(() => window.__stage5.health()) });
    }
  }
  if (playback && interactions) {
    report.interactions = [];
    for (const action of ['panel closed', 'panel open', 'scroll', 'density']) {
      await reset();
      await profileStart();
      const sample = await page.evaluate(async action => {
        const api = window.__stage5, frames = [], longTasks = [];
        let last = 0, raf;
        const frame = t => { if (last) frames.push(t - last); last = t; raf = requestAnimationFrame(frame); };
        raf = requestAnimationFrame(frame);
        const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
        observer.observe({ type: 'longtask' });
        const before = api.health(), start = performance.now();
        try {
          if (action === 'panel closed') api.closePanel();
          if (action === 'panel open') api.openChannelEffects('bass');
          const grid = document.getElementById('arrgrid'), positions = [];
          for (let i = 0; i < 30; i++) {
            if (action === 'scroll') {
              grid.scrollTop = (grid.scrollHeight - grid.clientHeight) * (i % 10) / 9;
              grid.scrollLeft = (grid.scrollWidth - grid.clientWidth) * (i % 10) / 9;
              positions.push([grid.scrollTop, grid.scrollLeft]);
            }
            if (action === 'density' && i % 5 === 0) {
              const input = document.getElementById('arrdensity');
              input.value = input.value === '1' ? '0' : '1';
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return { action, elapsedMs: performance.now() - start, frames, longTasks, positions,
            before, after: api.health(), metrics: api.snapshot() };
        } finally { cancelAnimationFrame(raf); observer.disconnect(); }
      }, action);
      sample.profile = await profileEnd(action);
      noGraphReset(sample.metrics);
      if (action === 'scroll') assert.ok(new Set(sample.positions.map(p => p.join(','))).size > 1, 'scroll probe actually moves');
      report.interactions.push(sample);
    }
    report.workletSwitches = [];
    const choices = await page.evaluate(() => window.__stage5.workletChoices());
    for (const choice of [...choices, ...choices]) {
      await reset();
      const before = await page.evaluate(() => window.__stage5.health());
      const start = performance.now();
      await page.evaluate(id => window.__stage5.pick('bass', id), choice.id);
      await page.waitForFunction(id => window.__stage5.voice('bass') === id && window.__stage5.resources().pendingVoices === 0, choice.id, { timeout: 15000 });
      const settledMs = performance.now() - start;
      await page.waitForTimeout(1000);
      const metrics = await counts(); noGraphReset(metrics);
      const after = await page.evaluate(() => window.__stage5.health());
      assert.equal(after.audioState, 'running');
      assert.equal(after.playing, true);
      for (const key of ['awFaults', 'awDropped', 'awUnresponsive']) assert.ok((after[key] || 0) <= (before[key] || 0), key + ' must not increase');
      report.workletSwitches.push({ ...choice, settledMs, before, after, metrics });
    }
    const dropoutStart = report.scenarios[0].before.dropouts;
    const observed = [...report.scenarios.slice(1).map(s => s.health),
      ...report.interactions.map(s => s.after), ...report.workletSwitches.map(s => s.after)];
    assert.ok(observed.every(h => h.dropouts <= dropoutStart), 'interaction sequence must not report new scheduler dropouts');
    report.checks.push('panel open/closed, actual long-song scrolling, row density and six real worklet-family selections');
  }
  if (playback && extended) {
    await page.evaluate(() => window.__stage5.pick('bass', 'toneSine'));
    await reset();
    await page.evaluate(() => window.__stage5.openVoice('bass'));
    report.editorOpen = { metrics: await counts(), editor: await page.evaluate(() => window.__stage5.editor()) };
    noGraphReset(report.editorOpen.metrics);
    assert.equal(report.editorOpen.editor.voice.songLocal, true);
    await reset();
    await page.evaluate(() => window.__stage5.pick('bass', 'toneTriangle'));
    report.editorSwitch = { metrics: await counts(), editor: await page.evaluate(() => window.__stage5.editor()) };
    noGraphReset(report.editorSwitch.metrics);
    assert.equal(report.editorSwitch.editor.voice.songLocal, true);
    assert.notDeepEqual(report.editorSwitch.editor.voice, report.editorOpen.editor.voice);
    await reset();
    report.editorEdit = await page.evaluate(() => window.__stage5.exerciseVoiceEdit());
    const editedFields = Object.keys(report.editorEdit.before).filter(key =>
      JSON.stringify(report.editorEdit.before[key]) !== JSON.stringify(report.editorEdit.after[key]));
    assert.ok(editedFields.length > 0, 'preset input changes its voice');
    for (const key of editedFields) {
      assert.deepEqual(report.editorEdit.storedAfter[key], report.editorEdit.after[key], 'edit reaches song draft: ' + key);
      assert.deepEqual(report.editorEdit.undone[key], report.editorEdit.before[key], 'editor undo: ' + key);
      assert.deepEqual(report.editorEdit.storedUndone[key], report.editorEdit.before[key], 'undo reaches song draft: ' + key);
    }
    noGraphReset(await counts());
    await page.evaluate(() => window.__stage5.closeVoice());
    report.checks.push('song-owned preset control edits persist to the draft and editor undo restores them without graph resets');
    report.checks.push('opening the song-owned editor and switching its preset avoid full graph resets');
    report.presetRaces = await page.evaluate(async song => {
      const api = window.__stage5;
      const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
      api.deferWarmups();
      try {
        api.pick('bass', 'toneSine'); api.pick('bass', 'toneSawtooth');
        window.__stage5Warm.resolve(1); await flush();
        window.__stage5Warm.resolve(0); await flush();
        const latest = api.voice('bass');
        api.pick('bass', 'toneTriangle'); api.pick('lead', 'toneSine');
        window.__stage5Warm.resolve(3); await flush();
        window.__stage5Warm.resolve(2); await flush();
        const separate = { bass: api.voice('bass'), lead: api.voice('lead') };
        api.pick('bass', 'toneSquare'); api.undo();
        const undone = api.voice('bass');
        window.__stage5Warm.resolve(4); await flush();
        const afterUndo = api.voice('bass');
        api.pick('bass', 'toneSine');
        const beforeSwitch = api.voice('bass');
        await api.selectSong('megamix'); await api.selectSong(song);
        window.__stage5Warm.resolve(5); await flush();
        return { latest, separate, undone, afterUndo, beforeSwitch,
          afterSwitch: api.voice('bass'), pending: api.resources().pendingVoices };
      } finally { window.__stage5Warm.restore(); }
    }, song);
    const race = report.presetRaces;
    assert.equal(race.latest, 'toneSawtooth');
    assert.deepEqual(race.separate, { bass: 'toneTriangle', lead: 'toneSine' });
    assert.equal(race.afterUndo, race.undone);
    assert.equal(race.afterSwitch, race.beforeSwitch);
    assert.equal(race.pending, 0);
    report.checks.push('controlled warmup races: latest per lane, independent channels, undo and song-return cancellation');
  }
  if (playback) await page.evaluate(() => window.__stage5.stop());
  if (interactions) {
    report.scrollAlignment = await page.evaluate(async () => {
      const grid = document.getElementById('arrgrid'), rail = document.getElementById('arrscroll');
      const ruler = document.getElementById('barsarea');
      const samples = [];
      const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.__stage5.rememberGrid();
      for (const compact of ['1', '0']) {
        const density = document.getElementById('arrdensity'); density.value = compact;
        density.dispatchEvent(new Event('change', { bubbles: true })); await frames();
        for (const fraction of [0, 0.5, 1]) {
          grid.scrollLeft = fraction * (grid.scrollWidth - grid.clientWidth);
          grid.scrollTop = fraction * (grid.scrollHeight - grid.clientHeight);
          grid.dispatchEvent(new Event('scroll')); await frames();
          const transform = getComputedStyle(ruler).transform;
          const x = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
          const row = grid.querySelector('.arrrow:not(.arrgrouprow)');
          const head = row.querySelector('.arrhead-cell'), bars = row.querySelector('.arrbars');
          samples.push({ compact, scroll: grid.scrollLeft, rail: rail.scrollLeft, ruler: x,
            rowHeight: row.getBoundingClientRect().height, headHeight: head.getBoundingClientRect().height,
            barsHeight: bars.getBoundingClientRect().height });
        }
      }
      grid.scrollTop = 0; grid.scrollLeft = 0; grid.dispatchEvent(new Event('scroll')); await frames();
      const bar = grid.querySelector('.arrrow:not(.arrgrouprow) .arrbar');
      bar.click();
      return { samples, retained: window.__stage5.gridRetained(), selection: window.__stage5.selection(),
        expected: { key: bar.closest('.arrrow').dataset.lane, bar: +bar.dataset.bar } };
    });
    for (const sample of report.scrollAlignment.samples) {
      assert.ok(Math.abs(sample.scroll - sample.rail) < 1, 'arrangement rail matches the grid');
      assert.ok(Math.abs(sample.ruler + Math.round(sample.scroll)) < 1, 'ruler follows the grid in both row densities');
      assert.ok(sample.rowHeight > 0 && Math.abs(sample.headHeight - sample.rowHeight) < 1 && Math.abs(sample.barsHeight - sample.rowHeight) < 1, 'note bars retain full row height in both densities');
    }
    assert.equal(report.scrollAlignment.retained, true);
    assert.equal(report.scrollAlignment.selection.key, report.scrollAlignment.expected.key);
    assert.equal(report.scrollAlignment.selection.from, report.scrollAlignment.expected.bar);
    await page.locator('#arrgrid .arrrow:not(.arrgrouprow) .arrbar').first().click({ button: 'right' });
    await page.locator('#regionedit.show').waitFor();
    assert.equal(await page.evaluate(() => {
      const menu = document.getElementById('regionedit'), rect = menu.getBoundingClientRect();
      return menu.contains(document.elementFromPoint(rect.left + 12, rect.top + 12));
    }), true, 'bar menu is above the isolated arrangement');
    await page.screenshot({ path: join(outDir, 'bar-menu.png') });
    await page.keyboard.press('Escape');
    report.checks.push('ruler/rail alignment at start, middle and end in both densities; mounted bars remain selectable');
  }
  await page.screenshot({ path: join(outDir, 'channel-panel.png') });
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.blockedWrites, []);
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks, scenarios: report.scenarios.map(s => ({ name: s.name, counts: Object.fromEntries(Object.entries(s.metrics).map(([key, value]) => [key, value.count])) })), output: outDir }));
} catch (error) {
  report.passed = false; report.failure = error.stack;
  if (page) await page.screenshot({ path: join(outDir, 'failure.png') }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await context?.close(); await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
