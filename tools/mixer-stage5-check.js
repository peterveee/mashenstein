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
const entry = entryRef ? execFileSync('git', ['show', `${entryRef}:tools/mixer-entry.js`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 }) : readFileSync(entryPath, 'utf8');
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
  pick: (key, id) => setLaneVoice(key, id, { autoCopy: false }),
  voice: key => laneVoiceId(key),
  livePan: key => Audio.mixer?.lane(key)?.state.pan,
  closePanel: () => setDevicesFolded(true),
  resources: () => ({ adjustCallbacks: channelAdjustDisposers.size, syncerKeys: channelMixSyncers.size,
    inspectorMeters: meters.filter(m => m.inspector).length,
    pendingVoices: pendingLaneVoices.size, pendingMirrors: pendingChannelMixSync.size }),
  effectState: key => ({ stored: effectsOf(key), liveCount: liveChain(key)?.length ?? 0 }),
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
  minify: false, write: false, logLevel: 'warning', outdir: join(root, 'dist'),
  plugins: [{ name: 'stage5-only-hooks', setup(builder) {
    builder.onLoad({ filter: /\/tools\/mixer-entry\.js$/ }, () => ({ contents: entry + hooks, loader: 'js' }));
  } }],
});
const js = bundle.outputFiles[0].text;
const html = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8')
  .replaceAll('/*__MIXER_BRAND__*/', 'TRK-24').replace('/*__MIXER_DEV_USER__*/', 'true')
  .replace('<script>/*__BUNDLE__*/</script>', '<script src="/bundle.js"></script>');
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  entryRef: entryRef || 'working tree', entryHash: hash(entry), bundleHash: hash(js), fixtureHash: hash(fixtureJson),
  instrumented, playback, extended, seconds, song, viewport: { width: 1440, height: 900 },
  caveat: 'Synchronous timings only; not heard latency. Non-quiet results are exploratory. No production diagnostics are installed.',
  suppressedDiagnosticWrites: 0, checks: [], scenarios: [], pageErrors: [], blockedWrites: [], unknownRoutes: [], started: new Date().toISOString() };
let browser, context, page, server;
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
  page.on('pageerror', error => { if (report.pageErrors.length < 30) report.pageErrors.push(error.message); });
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__stage5 && document.querySelector('#loadprogress')?.hidden === true, null, { timeout: 60000 });
  await page.evaluate(() => { window.__stage5.installGraphProbe(); window.__stage5.openChannelEffects('bass'); });
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
      await page.evaluate(key => window.__stage5.paste(key, [{ id: 'gain', params: { gain: -4 } }]), key);
      const pasted = await page.evaluate(key => window.__stage5.effectState(key), key);
      assert.deepEqual(pasted.stored, [{ id: 'gain', params: { gain: -4 } }]);
      assert.equal(pasted.liveCount, 1);
      noGraphReset(await counts());
      await page.evaluate(() => window.__stage5.undo());
      assert.deepEqual((await page.evaluate(key => window.__stage5.effectState(key), key)).stored, original.stored);
      await page.evaluate(key => window.__stage5.paste(key, []), key);
      const cleared = await page.evaluate(key => window.__stage5.effectState(key), key);
      assert.deepEqual(cleared.stored, []); assert.equal(cleared.liveCount, 0);
      await page.evaluate(() => window.__stage5.undo());
      assert.deepEqual((await page.evaluate(key => window.__stage5.effectState(key), key)).stored, original.stored);
      report.checks.push('paste / clear / undo: ' + key);
    }
    await page.evaluate(() => window.__stage5.openChannelEffects('bass'));
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
    const frames = [], longTasks = [], health = [];
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
        input.dispatchEvent(new Event('input', { bubbles: true }));
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
        before, after: window.__stage5.health(), health, frames, longTasks };
    } finally { active = false; cancelAnimationFrame(frameId); observer?.disconnect(); }
  }, { playback, seconds }));
  noGraphReset(report.scenarios.at(-1).metrics);
  assert.equal(report.scenarios.at(-1).mixPanAfter, Number(report.scenarios.at(-1).finalPan));
  if (playback) {
    for (const action of ['paste', 'copyVoice']) {
      await reset();
      await page.evaluate(action => {
        if (action === 'paste') window.__stage5.paste('bass', [{ id: 'gain', params: { gain: -3 } }]);
        else window.__stage5.copyVoice('bass');
      }, action);
      const metrics = await counts(); noGraphReset(metrics);
      report.scenarios.push({ name: 'playing ' + action, metrics,
        health: await page.evaluate(() => window.__stage5.health()) });
    }
  }
  if (playback && extended) {
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
