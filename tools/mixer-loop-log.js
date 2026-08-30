// The loop diagnostics log, as a file.
//
// The columns, the CSV they make, and the mirror that puts it on disk — lifted out of
// mixer-entry.js, where the column table sat among the watchdog's state and the writer
// sat two hundred lines below it.
//
// The RECORDS stay on the desk: it owns the array, trims it, persists it to localStorage
// and repaints the dialog from it. This is only the shape they take on their way out, so
// both entry points are handed the rows rather than reaching for them — which is also
// what makes the CSV checkable without a desk.

// ---- the seam ---------------------------------------------------------------
// Whether the developer surfaces are on at all. The mirror is a developer convenience
// and stays off entirely without it.
let devUser = false;

/** Tell the log whether this is a developer's desk. */
export function installLoopLog({ devUser: dev }) { devUser = dev; }

const LOOP_LOG_COLUMNS = [
  'time', 'session', 'song', 'lap', 'loopStart', 'loopEnd', 'recordType', 'status',
  'detail', 'audioState', 'preMasterPeak', 'postMasterPeak', 'masterClipTicks',
  'deadRuns', 'recoveryTier',
  'stallSource', 'stallSourceMs',
  'clockMin', 'schedulerMarginMinMs', 'longTaskMaxMs', 'dropoutsDelta', 'dropoutsTotal',
  // Priority 0 telemetry — measurement only, no behaviour behind any of it yet.
  'schedTicks', 'schedFineTickPct', 'schedLaneReads', 'schedFineLaneReadPct',
  'schedLaneReadsPerTick', 'schedPreamblePerTick',
  // Which named section of the desk's animation frame spent the most, and how much —
  // the column that turns "a 340ms task ran" into something to go and read.
  'frameHotspot', 'frameHotspotMs',
  'reliefMs', 'reliefEnters', 'reliefVerdict', 'auxDuty',
  'bufferMode', 'latencyRequest', 'baseLatencyMs', 'outputLatencyMs', 'readAheadMs',
  // `cacheQueued` is the BACKLOG at the moment of the row — what the cache still owes.
  // Before the queuedTotal rename it silently carried the lifetime count instead, which
  // is why every row logged before 2026-08-17 has it equal to `cacheMisses`.
  'cacheEnabled', 'cacheBuffers', 'cacheMB', 'cacheQueued', 'cacheQueuedTotal',
  'cacheRendering', 'cachePlanCandidates', 'cachePlanSelected', 'cachePlanCompleted',
  'cachePlanPending', 'cachePlanSelectedMB', 'cachePlanBenefit',
  'cacheHits', 'cacheMisses', 'cacheStale', 'pools', 'poolSlots', 'retiredPools',
  'liveNotes', 'heldNative', 'cachedSources', 'mrdrLaneStages', 'mrdrChorusLegs',
  'mrdrTailEligible', 'mrdrTailCulled', 'mrdrTailSkipped', 'mrdrTailPotentialMs',
  'mrdrTailSavedMs', 'mrdrTailRatio', 'jsHeapMB',
  // ---- what an EDIT costs ------------------------------------------------------
  //
  // "It plays smoothly under ideal conditions where nothing changes, but the second I
  // tweak something it falls apart." These four columns are what turns that sentence into
  // a measurement. `editMsMax` is the dearest single `VoiceRack.refresh` in the window —
  // a pot move lands there. `cacheRenderMsMax` is the dearest single note-cache render,
  // which is the work an edit CREATES: a tweak purges that voice's buffers and the desk
  // re-renders them while the song is playing. Peaks per window, not totals since load.
  'edits', 'editMsMax', 'cacheRenderMsMax', 'cacheRenderMsTotal',
  // ---- and whether the repair actually ran --------------------------------------
  //
  // An edit purges its voice's buffers, so its notes play live until they are re-rendered.
  // The desk now repairs the window the playhead is about to reach first. THREE counters
  // rather than one boolean, because they fail differently: queued but never started is
  // the idle gate or the clock brake refusing; started but never completing is a render
  // slower than the window; and `cacheQueued` alone cannot tell the repair's work apart
  // from ordinary background warming.
  'cacheUrgent', 'cacheUrgentQueued', 'cacheUrgentStarted', 'cacheUrgentCompleted',
  // ---- the MRDR-3 WORKLET's own account of itself ------------------------------
  //
  // An AW lane fills silence when its DSP throws rather than taking the song down with
  // it, which is the right behaviour and which makes the failure invisible: the lane
  // stops sounding and nothing else changes. These columns are the processor's own
  // counters, polled once a second while the worklet backend is on. `awFaults` above
  // zero means a lane HAS been filling silence; `awUnresponsive` means a processor did
  // not answer at all, which is the one that means dead. `awQueued` climbing while
  // `awGroups` sits at zero is the other shape — the schedule stopped firing.
  'awBackend', 'awLanes', 'awGroups', 'awQueued', 'awLate', 'awSteals', 'awFaults',
  'awUnresponsive', 'awDetached', 'awDropped',
  'operationDurationMs', 'operationBytes', 'operationSegments', 'heapBeforeMB', 'heapAfterMB',
  'profileTrack', 'profilePreset', 'profileBars', 'profileAudioSeconds',
  'profileFullMs', 'profileDryMs', 'profileLoadPct', 'profileFxDeltaMs',
];

const csvCell = (value) => {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

function loopLogCsv(records) {
  return [LOOP_LOG_COLUMNS.join(','), ...records.map((record) =>
    LOOP_LOG_COLUMNS.map((key) => csvCell(record[key])).join(','))].join('\n');
}

// Mirror the log onto the disk of the machine the desk is running on.
//
// The CSV has always been downloadable, which is right for keeping one and wrong for
// READING one: the question a performance investigation asks is "what did the last two
// passes do", and it is usually asked by somebody who is not sitting at this browser.
// The dev server writes it to `work/local/mixer-diagnostics.csv`, where anything can
// read it without a download, a file picker or a paste.
//
// Debounced, because a lap row and a fault event can land within a frame of each other
// and the point is a file on disk, not a request per record. Fire-and-forget: this is a
// convenience on top of localStorage, which remains the log that actually persists, so a
// desk served from anywhere but `npm run mixer` simply gets a 404 and carries on. The
// failure is remembered rather than logged each time — a console warning four times a
// minute about a mirror nobody asked for is its own kind of noise.
let diagnosticsMirrorTimer = null;
let diagnosticsMirrorOff = false;
function mirrorDiagnosticsLog(records) {
  if (!devUser || diagnosticsMirrorOff || diagnosticsMirrorTimer != null) return;
  diagnosticsMirrorTimer = setTimeout(async () => {
    diagnosticsMirrorTimer = null;
    try {
      const response = await fetch('/diagnostics-log', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: loopLogCsv(records),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      diagnosticsMirrorOff = true;
      console.log('[diagnostics] not mirroring to disk —'
        + ` this desk is not served by \`npm run mixer\` (${error.message})`);
    }
  }, 2000);
}

export { LOOP_LOG_COLUMNS, loopLogCsv, mirrorDiagnosticsLog };
