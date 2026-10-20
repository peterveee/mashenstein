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
//           the picture steps down a density rung (the main thread and the chip run cooler)
//           and the sequencer queues a second ahead instead of half.
//   DEEP    (still under 0.9 for 5 s with RELIEF on)  every lane but the drums, the bass and
//           the lead goes quiet — and is not synthesised — until the clock has read 0.98 or
//           better for 5 s; then they come back, still in 8-bit. A second DEEP in the same
//           level stays for the rest of it.
//   KICK    (still under 0.6 for 3 s with RELIEF on)  the audio context is suspended and
//           resumed: whatever backlog the device is stuck under is dropped, at the cost of a
//           fraction of a second of silence — in which the lanes, on the same clock, wait.
//   BACK    (the level is left)  everything is put back as it was. Not on a healthy
//           stretch: swapping back mid-level only walks the device into the same wall
//           (Peter, 20 Oct 2026: "not attempt to swap back once we've switched until we
//           exit the level"). 0.95, not 0.9: "by .95 it's just a crackle, at .9 it sounds
//           horrible".
//
// ON THE IPAD (Peter's trails, 20 Oct 2026): a suspended context does not come back without
// a tap, so main.js wires no kick. The 8-bit switch is the lever that helped, when it came
// EARLY; made with the thread already choking (0.87 and falling) the handover itself tipped
// it over, which is why relief fires at 0.95 — the first crackle — and not later.
//
// WHY DEEP (Peter's trails, 20 Oct 2026): once the clock tips (0.94 to 0.29 in two seconds)
// the iPad behaves as if its audio thread had a third to a quarter of its capacity, and
// stays there while the load is over that — then recovers completely (the full song ran at
// 1.00 again). 8-bit's 30–40% cut fits under it in a quiet stretch (Gravity bar 15, Rhythm
// bar 39) but not in Gravity's heavy one (bar 34: 0.31–0.44 to the end of the level). DEEP
// is the cut that fits; it lifts once the thread has come back, because a bare drums, bass
// and lead is no way to play a level.
//
// It reads the same once-a-second sample as the FPS readout and the glitch log
// (main.js sampleAudioHealth), so it costs nothing of its own.

export const GUARD = Object.freeze({
  reliefBelow: 0.95, reliefAfter: 2,
  deepBelow: 0.9, deepAfter: 5, liftAbove: 0.98, liftAfter: 5, deepTimes: 2,
  kickBelow: 0.6, kickAfter: 3,
  reliefLookahead: 1,
});

/**
 * `hooks` are the levers, so the guard can be tested without an engine:
 *   eightBit(on), densityRelief(on), lookahead(seconds | null), deep(on), kick() → Promise,
 *   note(text)
 */
export function createAudioGuard(hooks) {
  let level = 0;            // 0 normal, 1 relief, 2 deep
  let lowFor = 0, veryLowFor = 0, deepLowFor = 0, healthyFor = 0;
  let deeps = 0;            // DEEP steps taken in this level
  let kicking = false;
  let reliefPlace = undefined;   // the level relief came on in

  function relieve(clock, place) {
    level = 1;
    reliefPlace = place;
    deepLowFor = 0; healthyFor = 0; deeps = 0;
    hooks.eightBit?.(true);
    hooks.densityRelief?.(true);
    hooks.lookahead?.(GUARD.reliefLookahead);
    hooks.note?.(`GUARD relief:${hooks.eightBit ? ' 8-bit,' : ''} density down, 1 s lookahead (clock ${clock.toFixed(2)})`);
  }
  function goDeep(clock) {
    level = 2;
    deeps++;
    healthyFor = 0;
    hooks.deep(true);
    hooks.note?.(`GUARD deep: all but drums, bass and lead muted${deeps >= GUARD.deepTimes ? ' for the rest of the level' : ''} (clock ${clock.toFixed(2)})`);
  }
  function lift() {
    level = 1;
    deepLowFor = 0;
    hooks.deep(false);
    hooks.note?.(`GUARD lanes back: the clock held ${GUARD.liftAbove} for ${GUARD.liftAfter} s`);
  }
  function standDown() {
    if (level === 2) hooks.deep?.(false);
    level = 0;
    lowFor = 0; veryLowFor = 0; deepLowFor = 0; healthyFor = 0; deeps = 0;
    hooks.eightBit?.(false);
    hooks.densityRelief?.(false);
    hooks.lookahead?.(null);
    hooks.note?.('GUARD back to normal: the level was left');
  }

  return {
    get level() { return level; },
    /**
     * One second's audio clock (the audio/wall clock ratio). `place` is the level being
     * played (any value that changes when it is left — the run object), `running` false
     * skips the clock but still notices a level left.
     */
    tick(clock, running = true, place = null) {
      if (level > 0 && place !== reliefPlace) { standDown(); return; }
      if (!running || !Number.isFinite(clock) || clock <= 0 || kicking) return;
      lowFor = clock < GUARD.reliefBelow ? lowFor + 1 : 0;
      veryLowFor = clock < GUARD.kickBelow ? veryLowFor + 1 : 0;
      deepLowFor = clock < GUARD.deepBelow ? deepLowFor + 1 : 0;
      healthyFor = clock >= GUARD.liftAbove ? healthyFor + 1 : 0;
      if (level === 0 && lowFor >= GUARD.reliefAfter) { relieve(clock, place); return; }
      // DEEP is for a level: a menu's theme left as drums, bass and lead is no relief at all.
      if (level === 1 && hooks.deep && reliefPlace != null && deepLowFor >= GUARD.deepAfter) { goDeep(clock); return; }
      if (level === 2 && deeps < GUARD.deepTimes && healthyFor >= GUARD.liftAfter) { lift(); return; }
      if (level >= 1 && veryLowFor >= GUARD.kickAfter && hooks.kick) {
        kicking = true;
        veryLowFor = 0;
        hooks.note?.(`GUARD kick: audio context suspended and resumed (clock ${clock.toFixed(2)})`);
        Promise.resolve().then(() => hooks.kick()).catch(() => {}).finally(() => { kicking = false; });
      }
    },
  };
}
