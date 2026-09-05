// THE BARREL LANDS ON THE LINE, AND NO MORE OFTEN THAN IT DID.
//
// Level 3-3's mission line is "IT IS SOMEHOW ON BEAT". The boot meets a beat
// barrel a fixed lead after the beat it is scored on, and the barrel then flies
// a fixed arc, so when it reaches the tub is decided by where the tub is. The
// copter lines up for it (run.js steerCopterShot): a bar before the kick he
// works out from the roam he would have flown whether that kick was going to
// connect, and if so parks where the barrel's nose arrives on the next line.
//
// Two things a player would check, and this suite asserts both:
//   · every barrel that connects does so on a beat line, to the frame;
//   · the same perfect kick connects at the same rate whether he lines up or
//     not — Peter: "as long as it doesn't make it easier or harder to hit him".
// And one an engineer would: the bonk cue is placed on the song at the kick,
// on the line the barrel arrives on, rather than fired at the contact.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGES } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { Audio } = await import('../src/engine/audio.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const TICK = 1 / 60, MAX = 60 * 60 * 4;
const stage = STAGES.find((s) => s.id === 'rhythm-3');
const cab = CABINET_BY_ID[stage.cabinet];

/**
 * One run of the demo bot, which kicks every beat barrel, on a song clock
 * that follows the lane's own tempo ramp the way Audio.setWarp does live.
 * Returns each connecting barrel's distance from the nearest beat line, in
 * beats, plus the cues that were placed on the clock.
 */
function play(seed, onBeat) {
  save.settings.zoomIn = false;
  let beat = 0;
  Audio.sourceBank = cab.music;
  Audio.songBeat = () => beat;
  const cues = [];
  const realSfx = Audio.sfx;
  Audio.sfx = function (name, opt = {}) {
    if (name === 'copterBonk') cues.push({ beat, inBeats: opt.inBeats, cause: opt.cause });
    return realSfx.call(this, name, opt);
  };
  let result = null;
  const run = new RunState({
    stage, team: ['lorenzo', 'gnash', 'clara'], save, seed, difficulty: 1,
    onEnd: (r) => { result = r; },
  });
  run.enter();
  run.copterOnBeat = onBeat;   // after enter(), which resets it
  // The roam is a pure function of run time and the chart is fixed, so eight
  // seeds would be eight copies of one run. Starting the clock at a different
  // phase per seed samples different roams against the same barrels.
  run.tRun = (seed % 11) * 1.37;
  const bot = new DemoBot(run);
  const kicked = new Set();
  const out = { kicks: 0, hits: [], cues };
  let ticks = 0;
  while (!result && ticks < MAX) {
    ticks++;
    beat += TICK * run.laneBpm() / 60;
    bot.update(TICK); run.update(TICK);
    // The bot slides every beat barrel on its own, and the game boots it where
    // collide() finds it — which is where the planner quotes its mark from, so
    // the kick is the real one rather than the fairness suite's six units
    // early. Any barrel it fails to kick hurts it instead, and is not a shot.
    for (const ob of run.obstacles) {
      if (!ob.punted || kicked.has(ob) || ob.copterHit || ob.def?.punt !== 'heavy') continue;
      kicked.add(ob);
      out.kicks++;
    }
    for (const ob of kicked) {
      if (!ob.copterHit) continue;
      kicked.delete(ob);
      const off = beat - Math.round(beat);
      // Whether he lined up for this one. A barrel he did not — the roam
      // said it would miss and it grazed him anyway — lands where it lands.
      const cue = cues.find((q) => q.cause === 'barrel' && q.at == null && beat - q.beat < 1.2);
      if (cue) cue.at = beat;
      out.hits.push({ off, lined: !!cue });
    }
  }
  Audio.sfx = realSfx;
  return out;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => s * 101);
const lined = SEEDS.map((s) => play(s, true));
const free = SEEDS.map((s) => play(s, false));
const sum = (rs, k) => rs.reduce((n, r) => n + (Array.isArray(r[k]) ? r[k].length : r[k]), 0);
const kicksOn = sum(lined, 'kicks'), hitsOn = sum(lined, 'hits');
const kicksOff = sum(free, 'kicks'), hitsOff = sum(free, 'hits');
assert(kicksOn > 8 && hitsOn > 3, `the sweep kicked and connected (${hitsOn} of ${kicksOn} kicks)`);

// ON THE LINE, TO THE FRAME. A frame is 0.034 of a beat at 124bpm; the boot
// itself is found within half a frame, so a hit is allowed a frame either way.
const linedHits = lined.flatMap((r) => r.hits.filter((h) => h.lined));
const grazes = lined.flatMap((r) => r.hits.filter((h) => !h.lined));
const worst = linedHits.reduce((m, h) => Math.max(m, Math.abs(h.off)), 0);
assert(linedHits.length > 3 && worst <= 0.04,
  `every barrel he lined up for lands on a beat line (${linedHits.length} of them, worst `
  + `${(worst * 1000).toFixed(0)}‰ of a beat: ${linedHits.map((h) => (h.off * 1000).toFixed(0)).join(' ')})`);
// AND HE LINES UP FOR NEARLY ALL OF THEM. The roam is predicted to the unit,
// but the boot lands anywhere inside a four-unit frame, so a barrel that only
// grazes the hull at the very end of its arc can be called a miss and connect
// anyway. That one lands off the line; it has to stay rare.
assert(grazes.length <= Math.max(1, Math.floor(hitsOn * 0.1)),
  `and the ones he did not line up for are the odd graze (${grazes.length} of ${hitsOn} hits`
  + `${grazes.length ? `, at ${grazes.map((h) => (h.off * 1000).toFixed(0)).join(' ')}‰` : ''})`);

// AND IT WAS ALREADY GOING TO. Lined up or not, the same perfect kick connects
// at the same rate. The two runs diverge a little after each hit — a bonk taken
// a fraction earlier moves his whole cycle — so this is a rate with the same
// slack the framing test allows, not a count.
const rateOn = hitsOn / kicksOn, rateOff = hitsOff / kicksOff;
assert(Math.abs(rateOn - rateOff) <= 0.1,
  `lining up does not change how often a kick connects `
  + `(${(100 * rateOn).toFixed(0)}% lined up vs ${(100 * rateOff).toFixed(0)}% free)`);
// The unsteered run does NOT land on the line — otherwise this suite would be
// asserting a coincidence.
const freeOffs = free.flatMap((r) => r.hits.map((h) => h.off));
const freeWorst = freeOffs.reduce((m, o) => Math.max(m, Math.abs(o)), 0);
assert(freeWorst > 0.1,
  `and without lining up they land where they land (worst ${(freeWorst * 1000).toFixed(0)}‰ of a beat)`);

// THE CUE IS ON THE CLOCK. Every barrel cue is placed with inBeats and
// resolves to a whole beat, and every one of them met its bonk.
const placed = lined.flatMap((r) => r.cues.filter((q) => q.cause === 'barrel'));
const cueWorst = placed.reduce((m, q) => {
  const at = q.beat + q.inBeats;
  return Math.max(m, Math.abs(at - Math.round(at)));
}, 0);
assert(placed.length === linedHits.length && placed.every((q) => q.at != null && Number.isFinite(q.inBeats)),
  `every lined-up barrel had its bonk placed on the song at the kick, and landed it `
  + `(${placed.length} cues, ${linedHits.length} lined-up hits)`);
assert(cueWorst <= 0.001,
  `and each was placed on a whole beat (worst ${(cueWorst * 1000).toFixed(1)}‰ off)`);

if (failed) process.exit(1);
