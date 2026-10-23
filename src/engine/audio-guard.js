// THE AUDIO GUARD: when the audio thread falls behind, take load off it rather than let it
// struggle on (Peter, 20 Oct 2026: "system tries to continue and generally struggles
// completely moving forward").
//
// The iPad's first glitch log showed the failure plainly: two minutes into Gravity Grid the
// audio clock fell to 0.27 — the music rendered at a quarter of real time — with the frames
// fine, and it never came back, not even on the hub's light song. A pause would not help:
// the lanes run on the song's clock, so the game already waits for the music, and a stop
// does not take away whatever is overloading it. So, one step at a time, each on the clock
// of the music and each written to the glitch log:
//
//   RELIEF  (clock under 0.95 for 2 s)  the song goes over to its 8-bit version on the next
//           beat — the 8-Bit set's synths and no reverb, a quarter to two-fifths less load —
//           and the picture steps down a density rung (the main thread and the chip run
//           cooler). Peter, 22 Oct 2026: "the 8-bit switch seems to be reliable enough".
//   AHEAD   (holes — a queue margin under zero or a late pass — for 2 s)  the sequencer
//           queues a second ahead instead of half. Its own lever, for its own cause: HOLES
//           are the main thread starving the transport, and lookahead is what cures them.
//           It does nothing for CRACKLE — an audio thread over its budget — and queueing
//           further ahead there only books more notes onto a thread that cannot render the
//           ones it has (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage S, 22 Oct 2026). Until 22 Oct
//           relief raised it on crackle alone.
//   RESTART (still under 0.9 for 3 s with RELIEF on, or a second under 0.7, or a second of
//           audio behind in all)  the audio is stopped and started again: the whole
//           AudioContext closed, backlog and all, and a new one built with the song where
//           its clock was (main.js audioRestart → Audio.rebuildRealtimeContext). Silence for
//           the moment it takes; if the new context will not run without a tap, the game
//           pauses and asks for one. Peter, 22 Oct 2026: "I just want silence once the sound
//           starts to sound bad… and then for audio to restart after; if a click is required,
//           then perhaps pause things and tell the user to click a button". From the second
//           RESTART in a level, every lane but the drums, the bass and the lead stays muted
//           (`hooks.deep`), so the song comes back lighter than the one that tipped it.
//   BACK    (the level is left)  everything is put back as it was. Not on a healthy
//           stretch: swapping back mid-level only walks the device into the same wall
//           (Peter, 20 Oct 2026: "not attempt to swap back once we've switched until we
//           exit the level"). 0.95, not 0.9: "by .95 it's just a crackle, at .9 it sounds
//           horrible".
//
// WHY A RESTART AND NOT LESS (the iPad, 22 Oct 2026). Once its thread has tipped, the iPad
// holds it slow — 0.3–0.4 whatever is taken away; muting every lane did nothing — and the
// backlog grows at half a second a second. The only thing that released it was a near-zero
// load (a second of no music, a song change), and the release was a BURST: WebKit rendered
// the whole backlog at once (the clock read 3.4–5.6 for a second), and after a burst of three
// seconds or more the device played everything late, or nothing at all until the page was
// reloaded. A closed context takes its backlog with it; a new one starts clean. The levers
// tried before it — DEEP (all but drums, bass and lead muted) and STOP (a second of no
// music, Audio.hushMusic) — stay in the engine, but the guard no longer pulls them on their
// own: DEEP as a lever worked once at 0.90 and never once the thread had latched, and STOP's
// release was the burst. The DEBT, Σ(1 − clock) over the seconds under 0.97 (a catch-up second
// pays it off), is what the burst would have been, so it is a trigger of its own: a second of
// it and the restart comes before the backlog can hurt.
//
// ON THE IPAD (Peter's trails, 20 Oct 2026): the 8-bit switch is the lever that helped, when
// it came EARLY; made with the thread already choking (0.87 and falling) the handover itself
// tipped it over, which is why relief fires at 0.95 — the first crackle — and not later.
//
// It reads the same once-a-second sample as the FPS readout and the glitch log
// (main.js sampleAudioHealth), so it costs nothing of its own.

export const GUARD = Object.freeze({
  reliefBelow: 0.95, reliefAfter: 2,
  restartBelow: 0.9, restartAfter: 3, restartNow: 0.7, restartDebt: 1.0, restartSettle: 8,
  deepOnRestart: 2, restartTimes: 2,
  healthyAbove: 0.98, healthyClear: 5,
  reliefLookahead: 1, holesAfter: 2,
});

/**
 * `hooks` are the levers, so the guard can be tested without an engine:
 *   eightBit(on), densityRelief(on), lookahead(seconds | null), restart(clock, debt),
 *   deep(on), note(text)
 */
export function createAudioGuard(hooks) {
  let level = 0;            // 0 normal, 1 relief, 2 relief with the lanes muted (deep)
  let lowFor = 0, badFor = 0, healthyFor = 0;
  let reliefPlace = undefined;   // the level relief came on in
  let reliefInLevel = false;
  let holesFor = 0;
  let restarts = 0, settleFor = 0;   // RESTARTs taken in this level; seconds before another may
  // THE DEBT: seconds of audio the thread has fallen behind by, Σ(1 − clock), since the clock
  // was last healthy. WebKit renders every one of them later, at once, when the load drops
  // (the iPad, 22 Oct 2026: ≈3.4 s of it read C 3.37 the next second, ≈4.8 s read C 4.78) —
  // and after a burst like that the iPad played everything late, or nothing. A second over 1
  // is the catch-up, and pays it off. Jitter either side of 1 counts for nothing (0.97–0.99 a
  // second for a minute is not a second behind), and five healthy seconds clear it: the debt
  // is the trouble now, not the trouble last minute.
  let debt = 0;
  let ahead = false;
  let aheadPlace = undefined;    // the level the lookahead went up in

  function relieve(clock, place, inLevel) {
    level = 1;
    reliefPlace = place;
    reliefInLevel = !!inLevel;
    badFor = 0; healthyFor = 0; restarts = 0; settleFor = 0;
    hooks.eightBit?.(true);
    hooks.densityRelief?.(true);
    hooks.note?.(`GUARD relief:${hooks.eightBit ? ' 8-bit,' : ''} density down (clock ${clock.toFixed(2)})`);
  }
  function queueAhead(sched, place) {
    ahead = true;
    aheadPlace = place;
    hooks.lookahead?.(GUARD.reliefLookahead);
    hooks.note?.(`GUARD ahead: ${GUARD.reliefLookahead} s lookahead for holes (margin ${sched.margin ?? '-'} ms, ${sched.late ?? 0} late)`);
  }
  function aheadDown() {
    ahead = false;
    holesFor = 0;
    hooks.lookahead?.(null);
  }
  function restart(clock) {
    restarts++;
    settleFor = GUARD.restartSettle;
    const behind = debt;
    debt = 0; badFor = 0; healthyFor = 0;
    let lighter = '';
    if (restarts >= GUARD.deepOnRestart && hooks.deep && level < 2) {
      level = 2;
      hooks.deep(true);
      lighter = ', all but drums, bass and lead muted from here';
    }
    hooks.restart(clock, behind);
    const last = restarts >= GUARD.restartTimes ? ', the last this level' : '';
    hooks.note?.(`GUARD restart: audio stopped and started again${lighter}${last} (clock ${clock.toFixed(2)}, ${behind.toFixed(1)} s behind)`);
  }
  function standDown(why = 'the level was left') {
    if (level === 2) hooks.deep?.(false);
    level = 0;
    lowFor = 0; badFor = 0; healthyFor = 0; restarts = 0; settleFor = 0; debt = 0;
    hooks.eightBit?.(false);
    hooks.densityRelief?.(false);
    hooks.note?.(`GUARD back to normal: ${why}`);
  }

  return {
    get level() { return level; },
    get ahead() { return ahead; },
    get debt() { return debt; },
    /** The player has taken the soundtrack back (SETTINGS, the jukebox's 8-BIT): every lever
     *  off, the counts from zero — if the device still cannot carry the song, it goes again. */
    release() {
      if (level === 0) return;
      standDown('the player chose the soundtrack');
    },
    /**
     * One second's audio clock (the audio/wall clock ratio). `place` is the level being
     * played (any value that changes when it is left — the run object), `running` false
     * skips the clock but still notices a level left. `sched` is the same second's
     * sequencer health — `{ margin, late }`, the worst queue margin in ms and the passes
     * that came late — which is what decides the lookahead, never the clock.
     */
    tick(clock, running = true, place = null, sched = null, inLevel = place != null) {
      if (ahead && place !== aheadPlace) aheadDown();
      if (level > 0 && place !== reliefPlace) { standDown(inLevel || reliefInLevel ? 'the level was left' : 'the song changed'); return; }
      if (running && sched) {
        const holes = (sched.late || 0) > 0 || (Number.isFinite(sched.margin) && sched.margin < 0);
        holesFor = holes ? holesFor + 1 : 0;
        if (!ahead && holesFor >= GUARD.holesAfter) queueAhead(sched, place);
      }
      if (!running || !Number.isFinite(clock) || clock <= 0) return;
      lowFor = clock < GUARD.reliefBelow ? lowFor + 1 : 0;
      badFor = clock < GUARD.restartBelow ? badFor + 1 : 0;
      healthyFor = clock >= GUARD.healthyAbove ? healthyFor + 1 : 0;
      if (clock < 0.97) debt += 1 - clock;
      else if (clock > 1.03) debt = Math.max(0, debt - (Math.min(clock, 3) - 1));
      if (healthyFor >= GUARD.healthyClear) debt = 0;
      if (level === 0 && lowFor >= GUARD.reliefAfter) { relieve(clock, place, inLevel); return; }
      if (settleFor > 0) { settleFor--; return; }
      // Twice a level at most: a song the device cannot carry restarts into the same wall (Chrome on
      // the Mac, 23 Oct 2026: the load song restarted every ten seconds for as long as it played).
      if (level >= 1 && hooks.restart && restarts < GUARD.restartTimes
        && (badFor >= GUARD.restartAfter || clock < GUARD.restartNow || debt >= GUARD.restartDebt)) {
        restart(clock);
      }
    },
  };
}
