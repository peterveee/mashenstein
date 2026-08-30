// The live performance panel — the developer's window onto the audio health watchdog.
//
// Lifted out of mixer-entry.js, where it was four blocks scattered through 1,200 lines
// of watchdog: its elements sat with the watchdog's, its ring buffer sat with the loop
// log's, its sampler sat next to checkAudioHealth and its window sat six hundred lines
// further down. The watchdog itself could not come — it reads and WRITES the desk
// (it stops the transport when the graph falls far enough behind) — but this half only
// ever reads, which is why it can be handed its sources instead of reaching for them.
//
// It shows one snapshot and a ring of the last few hundred, in the page and optionally
// in a popped-out window. Everything it needs to know about the desk arrives through
// `sources`; everything it does to the desk is one toast and one dialog it politely
// closes on its way up.

import { Audio } from '../src/engine/audio.js';

const $ = (id) => document.getElementById(id);

const PERF_DIAG_LIMIT = 240;
const PERF_DIAG_SAMPLE_MS = 1000;
const PERF_POS_KEY = 'mash-mixer-perfdiag-pos';

/**
 * Build the panel and wire it to the desk's chrome.
 *
 * @param devUser   whether the developer surfaces are on at all. The button hides and
 *                  every sampler returns early without it.
 * @param health    the watchdog's own record, read live — the same object it writes.
 * @param loopHealthWindow  the per-lap aggregate, for the long-task high-water mark.
 * @param isPlaying whether the transport is running. A thunk because the desk's flag is
 *                  reassigned and this needs the current answer, not the one at build.
 * @param fields    the three field providers the snapshot is assembled from: the
 *                  runtime, the scheduler's work and whatever owned the last frame.
 * @param clamp     the desk's own clamp, so a dragged panel stops where its dialogs do.
 * @param toast     the desk's message corner.
 * @param closeMenu the button that opens this lives in a menu.
 * @param yieldChrome  what to shut before the panel comes up. The audio settings dialog
 *                  is modal and would swallow the panel; it is passed as a thunk because
 *                  it is declared four hundred lines after this is built.
 */
export function createPerfDiag({
  devUser, health, loopHealthWindow, isPlaying, fields, clamp, toast, closeMenu, yieldChrome,
}) {
  const { diagnosticRuntimeFields, schedulerWorkFields, frameHotspotFields } = fields;
  const perfDiagOpen = $('perfdiagopen');
  const perfDiag = $('perfdiag');
  const perfDiagHead = $('perfdiaghead');
  const perfDiagClose = $('perfdiagclose');
  const perfDiagDone = $('perfdiagdone');
  const perfDiagClear = $('perfdiagclear');
  const perfDiagPopout = $('perfdiagpopout');
  const perfDiagState = $('perfdiagstate');
  const perfDiagStatus = $('perfdiagstatus');
  const perfDiagLog = $('perfdiaglog');
  const perfDiagMetricEls = new Map(
    [...document.querySelectorAll('#perfdiagmetrics .perfmetric')]
      .map((el) => [el.dataset.perfmetric, el]),
  );


  let perfDiagRecords = [];
  let perfDiagLastSampleAt = 0;
  let perfDiagLastKey = '';
  let perfDiagPopup = null;

  function perfDiagSnapshot() {
    const runtime = diagnosticRuntimeFields();
    const scheduler = schedulerWorkFields();
    const hotspot = frameHotspotFields();
    const ratio = Number.isFinite(health.ratio) ? +health.ratio.toFixed(3) : null;
    const margin = Number.isFinite(health.marginMin) ? +(health.marginMin * 1000).toFixed(1) : null;
    const status = health.audioBehind ? 'AUDIO OVERLOADED'
      : health.audioStruggling ? 'AUDIO STRUGGLING'
        : health.uiStalled ? 'PLAYBACK INTERRUPTED'
          : isPlaying() ? (runtime.cacheRendering ? 'CACHE RENDERING' : 'PLAYING') : 'STOPPED';
    return {
      ...runtime, ...scheduler, ...hotspot, status, ratio, margin,
      longTask: Math.round(Math.max(health.longTask || 0, loopHealthWindow.longTaskMax || 0)),
      dropouts: health.dropouts || 0, audioState: Audio.ctx?.state || 'uninitialised',
      playing: isPlaying(), time: new Date().toISOString(),
    };
  }

  const perfNumber = (value, suffix = '') => value == null || value === '' || !Number.isFinite(Number(value))
    ? '—' : `${value}${suffix}`;

  function perfDiagDetail(snapshot) {
    const clock = perfNumber(snapshot.ratio, 'x');
    const margin = perfNumber(snapshot.margin, ' ms');
    const cache = `cache q${snapshot.cacheQueued}/r${snapshot.cacheRendering}`
      + (snapshot.cachePlanCandidates ? ` · plan ${snapshot.cachePlanCompleted}/${snapshot.cachePlanSelected}` : '')
      + ` · hits ${snapshot.cacheHits || 0}/misses ${snapshot.cacheMisses || 0}`;
    const cpu = snapshot.frameHotspot
      ? ` · hot ${snapshot.frameHotspot} ${snapshot.frameHotspotMs || 0}ms`
      : '';
    return `clock ${clock} · margin ${margin} · ${cache} · dropouts ${snapshot.dropouts}${cpu}`;
  }

  function perfDiagPayload() {
    return {
      current: perfDiagCurrent,
      records: perfDiagRecords.slice(),
    };
  }

  let perfDiagCurrent = null;

  function syncPerfDiagPopup() {
    const popup = perfDiagPopup;
    if (!popup || popup.closed) { perfDiagPopup = null; return; }
    try {
      const payload = perfDiagPayload();
      const state = popup.document.getElementById('mash-perf-state');
      const metrics = popup.document.getElementById('mash-perf-metrics');
      const log = popup.document.getElementById('mash-perf-log');
      if (!state || !metrics || !log) return;
      const current = payload.current || {};
      state.textContent = `${current.status || 'WAITING'} · ${current.time || ''}`;
      metrics.textContent = current.status ? [
        `AUDIO  ${current.status} · clock ${perfNumber(current.ratio, 'x')} · margin ${perfNumber(current.margin, ' ms')} · long task ${perfNumber(current.longTask, ' ms')} · dropouts ${current.dropouts} · ${current.frameHotspot ? `hot ${current.frameHotspot} ${current.frameHotspotMs || 0}ms` : 'no frame hotspot yet'}`,
        `CACHE  ${current.cacheEnabled ? 'on' : 'off'} · ${current.cacheBuffers} buffers · ${current.cacheMB || 0} MB · queue ${current.cacheQueued} · rendering ${current.cacheRendering} · plan ${current.cachePlanCompleted || 0}/${current.cachePlanSelected || 0} · hits/misses/stale ${current.cacheHits || 0}/${current.cacheMisses || 0}/${current.cacheStale || 0}`,
        `MRDR   ${current.mrdrLaneStages || 0} lane stages · ${current.mrdrChorusLegs || 0} wet legs · ${current.liveNotes || 0} live notes · ${current.cachedSources || 0} cached sources · tails ${current.mrdrTailCulled || 0} culled`,
        `OUTPUT ${current.audioState || '—'} · ${current.bufferMode || '—'} · base ${perfNumber(current.baseLatencyMs, ' ms')} · read-ahead ${perfNumber(current.readAheadMs, ' ms')} · heap ${perfNumber(current.jsHeapMB, ' MB')}`,
      ].join('\n') : 'Waiting for a sample…';
      log.textContent = payload.records.map((record) => {
        const time = record.time?.slice(11, 23) || '';
        return `${time} ${String(record.status || '').padEnd(22)} ${record.detail || ''}`;
      }).join('\n');
      log.scrollTop = log.scrollHeight;
    } catch {
      perfDiagPopup = null;
    }
  }

  function refreshPerfDiagUi() {
    if (!perfDiagOpen || !perfDiag) return;
    perfDiagOpen.hidden = !devUser;
    if (!devUser) return;
    const current = perfDiagCurrent || perfDiagSnapshot();
    const metricText = {
      audio: `${current.status || 'WAITING'}\nclock ${perfNumber(current.ratio, 'x')} · margin ${perfNumber(current.margin, ' ms')}\nlong task ${perfNumber(current.longTask, ' ms')} · dropouts ${current.dropouts || 0}\n${current.frameHotspot ? `hot ${current.frameHotspot} · ${current.frameHotspotMs || 0} ms` : 'no frame hotspot yet'}${current.schedTicks ? `\nscheduler ${current.schedTicks} ticks · fine ${current.schedFineTickPct || 0}% · lanes ${current.schedLaneReads || 0}` : ''}`,
      cache: `${current.cacheEnabled ? 'ON' : 'OFF'} · ${current.cacheBuffers || 0} buffers · ${current.cacheMB || 0} MB\nqueue ${current.cacheQueued || 0} · rendering ${current.cacheRendering || 0}\nplan ${current.cachePlanCompleted || 0}/${current.cachePlanSelected || 0} · pending ${current.cachePlanPending || 0}\nhits ${current.cacheHits || 0} · misses ${current.cacheMisses || 0} · stale ${current.cacheStale || 0}`,
      mrdr: `${current.mrdrLaneStages || 0} lane stages · ${current.mrdrChorusLegs || 0} wet legs\nlive ${current.liveNotes || 0} · cached ${current.cachedSources || 0}\ntails ${current.mrdrTailCulled || 0} culled · ${current.mrdrTailSkipped || 0} skipped`,
      browser: `${current.audioState || '—'} · ${current.bufferMode || '—'}\nbase ${perfNumber(current.baseLatencyMs, ' ms')} · read-ahead ${perfNumber(current.readAheadMs, ' ms')}\nheap ${perfNumber(current.jsHeapMB, ' MB')} · pools ${current.pools || 0}`,
    };
    for (const [key, el] of perfDiagMetricEls) {
      const p = el.querySelector('p');
      if (p) p.textContent = metricText[key] || '—';
      el.classList.toggle('bad', key === 'audio' && /OVERLOADED|STRUGGLING|INTERRUPTED/.test(current.status || ''));
    }
    if (perfDiagState) perfDiagState.textContent = current.status
      ? `${current.status} · ${current.time?.slice(11, 23) || ''}` : 'Waiting for playback';
    if (perfDiagStatus) perfDiagStatus.textContent = perfDiagRecords.length
      ? `${perfDiagRecords.length} live message${perfDiagRecords.length === 1 ? '' : 's'} · latest: ${perfDiagRecords.at(-1).detail}`
      : 'Open the song and press Play to begin live sampling.';
    if (perfDiagLog) {
      perfDiagLog.textContent = perfDiagRecords.map((record) => {
        const time = record.time?.slice(11, 23) || '';
        return `${time} ${String(record.status || '').padEnd(22)} ${record.detail || ''}`;
      }).join('\n');
      perfDiagLog.scrollTop = perfDiagLog.scrollHeight;
    }
    syncPerfDiagPopup();
  }

  function recordPerfDiag(kind, status, detail, snapshot = null) {
    if (!devUser) return;
    const current = snapshot || perfDiagSnapshot();
    perfDiagCurrent = current;
    perfDiagRecords.push({
      time: current.time, kind, status, detail,
      ...current,
    });
    if (perfDiagRecords.length > PERF_DIAG_LIMIT) {
      perfDiagRecords.splice(0, perfDiagRecords.length - PERF_DIAG_LIMIT);
    }
    refreshPerfDiagUi();
  }

  function samplePerfDiag(force = false) {
    if (!devUser || (!isPlaying() && !force)) return;
    const now = performance.now();
    if (!force && now - perfDiagLastSampleAt < PERF_DIAG_SAMPLE_MS) return;
    const snapshot = perfDiagSnapshot();
    const key = [snapshot.status, snapshot.ratio, snapshot.margin, snapshot.cacheQueued,
      snapshot.cacheRendering, snapshot.cachePlanPending, snapshot.dropouts,
      snapshot.mrdrLaneStages, snapshot.mrdrChorusLegs].join('|');
    // Keep the once-a-second heartbeat while playing, but also retain immediate samples
    // when a verdict or queue state changes so a dropout has a useful lead-in.
    if (!force && key === perfDiagLastKey && now - perfDiagLastSampleAt < PERF_DIAG_SAMPLE_MS * 2) return;
    perfDiagLastSampleAt = now;
    perfDiagLastKey = key;
    recordPerfDiag('sample', snapshot.status, perfDiagDetail(snapshot), snapshot);
  }


  function placePerfDiag(x = null, y = null) {
    if (!perfDiag) return;
    if (x == null || y == null) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(PERF_POS_KEY) || 'null'); } catch { saved = null; }
      x = saved?.x ?? Math.max(8, (innerWidth - perfDiag.offsetWidth) / 2);
      y = saved?.y ?? 70;
    }
    const left = clamp(Number(x) || 8, 6, Math.max(6, innerWidth - perfDiag.offsetWidth - 6));
    const top = clamp(Number(y) || 8, 6, Math.max(6, innerHeight - perfDiag.offsetHeight - 6));
    perfDiag.style.left = `${left}px`;
    perfDiag.style.top = `${top}px`;
    perfDiag.style.transform = 'none';
    try { localStorage.setItem(PERF_POS_KEY, JSON.stringify({ x: left, y: top })); } catch { /* optional preference */ }
  }

  function openPerfDiag() {
    if (!devUser || !perfDiag) return;
    yieldChrome();
    perfDiag.hidden = false;
    perfDiagOpen?.setAttribute('aria-expanded', 'true');
    placePerfDiag();
    samplePerfDiag(true);
    perfDiagClose?.focus();
  }

  function closePerfDiag() {
    if (!perfDiag) return;
    perfDiag.hidden = true;
    perfDiagOpen?.setAttribute('aria-expanded', 'false');
    perfDiagOpen?.focus();
  }

  // The panel is intentionally not modal: a developer can drag it out of the way while
  // moving faders, and the song continues under it. Buttons in the title bar are excluded
  // so a click on Clear/Pop out never starts a move gesture.
  perfDiagHead?.addEventListener('pointerdown', (event) => {
    if (perfDiag?.hidden || event.target.closest('button')) return;
    event.preventDefault();
    const rect = perfDiag.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    const move = (next) => placePerfDiag(next.clientX - dx, next.clientY - dy);
    const stop = () => {
      perfDiagHead.classList.remove('dragging');
      perfDiagHead.removeEventListener('pointermove', move);
    };
    perfDiagHead.classList.add('dragging');
    try { perfDiagHead.setPointerCapture(event.pointerId); } catch { /* synthetic pointer */ }
    perfDiagHead.addEventListener('pointermove', move);
    perfDiagHead.addEventListener('pointerup', stop, { once: true });
    perfDiagHead.addEventListener('pointercancel', stop, { once: true });
  });

  function openPerfDiagPopup() {
    if (!devUser) return;
    const popup = window.open('', 'mash-mixer-performance',
      'popup=yes,width=900,height=680,resizable=yes,scrollbars=yes');
    if (!popup) { toast('Pop-out blocked — the in-page log is still available'); return; }
    perfDiagPopup = popup;
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>MASHENSTEIN live performance</title><style>
      :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:16px;background:#151820;color:#e8ebf2;font:12px/1.45 ui-monospace,monospace}
      h1{margin:0 0 4px;color:#50d0ba;font:600 15px/1.2 ui-sans-serif,system-ui;letter-spacing:.08em}
      #mash-perf-state{color:#a4acbb;font-size:10px}#mash-perf-metrics{margin:14px 0 10px;padding:10px;border:1px solid #303746;border-radius:6px;white-space:pre-wrap}
      #mash-perf-log{margin:0;padding:10px;min-height:500px;max-height:calc(100vh - 100px);overflow:auto;border:1px solid #303746;border-radius:6px;background:#0e1117;white-space:pre-wrap}
    </style></head><body><h1>LIVE PERFORMANCE</h1><div id="mash-perf-state">Waiting for playback</div><pre id="mash-perf-metrics">Waiting for a sample…</pre><pre id="mash-perf-log" tabindex="0"></pre></body></html>`);
    popup.document.close();
    popup.addEventListener('beforeunload', () => { if (perfDiagPopup === popup) perfDiagPopup = null; }, { once: true });
    popup.focus();
    syncPerfDiagPopup();
  }

  perfDiagOpen?.addEventListener('click', () => { closeMenu(); openPerfDiag(); });
  perfDiagClose?.addEventListener('click', closePerfDiag);
  perfDiagDone?.addEventListener('click', closePerfDiag);
  perfDiagClear?.addEventListener('click', () => {
    perfDiagRecords = [];
    perfDiagCurrent = null;
    perfDiagLastKey = '';
    refreshPerfDiagUi();
    toast('Live performance log cleared');
  });
  perfDiagPopout?.addEventListener('click', openPerfDiagPopup);
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || perfDiag?.hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closePerfDiag();
  }, true);
  addEventListener('resize', () => {
    if (!perfDiag?.hidden) placePerfDiag(perfDiag.offsetLeft, perfDiag.offsetTop);
  });
  refreshPerfDiagUi();

  return {
    snapshot: perfDiagSnapshot,
    detail: perfDiagDetail,
    record: recordPerfDiag,
    sample: samplePerfDiag,
    refresh: refreshPerfDiagUi,
  };
}
