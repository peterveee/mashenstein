// THE CLUB'S SOUND SWAPS, LEVELLED (src/game/banger/club-voices.js trimFor; Peter, 9 Oct 2026:
// "can we do it when swapping by hand also? there seems to huge variation even when its done
// with the dice"). A swapped sound's fader moves by what the level model says the swap costs on
// the lane's own notes — up by no more than MAX_LEVEL_MOVE, down by up to 12 dB — and the move
// lands on the strip at the step the swap does, and comes off again when the sound goes back.
import { installDom } from './dom-stub.js';
installDom();

const { makeBanger, MAKER_STYLES } = await import('../src/game/banger/make.js');
const { ClubVoices, laneBars, mixWithKept } = await import('../src/game/banger/club-voices.js');
const { predictedProcessedPart, levelWindow, soundOf, MAX_LEVEL_MOVE } = await import('../tools/lib/banger/levels.js');
const { laneVoiceOf } = await import('../tools/lib/banger/riff.js');
const { hasNotes } = await import('../tools/lib/banger/theory.js');
const { Audio } = await import('../src/engine/audio.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const NOTES = [7, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1];
const PARTS = ['bass', 'chords', 'lead'];

// A bank read back into bars: two per section, a one-bar order entry, Hz back to note names.
{
  const lead = Array(32).fill(null); lead[0] = 440; lead[16] = [261.63, 329.63];
  const leadLen = Array(32).fill(null); leadLen[0] = 4;
  const kick = Array(32).fill(false); kick[0] = true;
  const bars = laneBars({ sections: [{ lead, leadLen, kick }], order: [0, { s: 0, bars: 1 }] }, 'lead');
  const drums = laneBars({ sections: [{ lead, leadLen, kick }], order: [0] }, 'kick');
  assert(bars.length === 3 && bars[0].notes[0] === 'A4' && bars[0].lens[0] === 4 && bars[1].notes[0].join() === 'C4,E4'
    && bars[2].notes[0] === 'A4' && Array.isArray(drums[0]) && drums[0][0] === true && drums[1] === null,
  'a lane\'s bars come back out of the bank in play order, as note names, its drums as rows');
}

// Every Lab style, each of its flavours, on its own set and on 8-BIT: a part's sound list names
// each sound once (Peter, 9 Oct 2026: two WIDE DETUNE BASS on big-room's, one a seed kept from the
// other unchanged) — a seed that is its preset under another id shown once, one tuned off it
// under its own name.
{
  const { flavoursFor } = await import('../tools/lib/banger/styles/index.js');
  const twice = [];
  let lists = 0;
  for (const style of MAKER_STYLES) {
    for (const flavour of [null, ...flavoursFor(style.id).map((f) => f.id)]) {
      let song;
      try { song = makeBanger({ notes: NOTES, mode: 'simple', style: style.id, seed: 3, flavour }); } catch { continue; }
      const v = new ClubVoices(song, { style: style.id, flavour });
      for (const part of ['drums', ...PARTS]) {
        for (const swapped of [false, true]) {
          const names = v.choices(part, swapped).map((c) => c.label);
          lists++;
          const dup = names.find((n, i) => names.indexOf(n) !== i);
          if (dup) twice.push(`${style.id}${flavour ? `/${flavour}` : ''} ${part}${swapped ? ' (8-BIT)' : ''}: ${dup}`);
        }
      }
    }
  }
  assert(lists > 100 && !twice.length, `no sound list names a sound twice (${lists} lists${twice.length ? `; ${twice.join('; ')}` : ''})`);
}

// Every Lab style: a part's sounds land together once each has its trim on.
const spreads = [];
let clampedRight = true, beyond = 0;
for (const style of MAKER_STYLES) {
  let song;
  try { song = makeBanger({ notes: NOTES, mode: 'simple', style: style.id, seed: 3, voltage: 1, expression: 3 }); } catch { continue; }
  const v = new ClubVoices(song, { style: style.id });
  for (const part of PARTS) {
    const lane = v.partLane(part);
    if (!lane) continue;
    const all = laneBars(song.bank, lane);
    const win = levelWindow(song.form, (b) => hasNotes(all[b]));
    if (!win) continue;
    const bars = all.slice(win[0], win[1] + 1);
    const level = (sound) => predictedProcessedPart({ bars, bpm: song.bpm, lane, sound, strip: song.mix.lanes?.[lane] });
    const own = level(soundOf(laneVoiceOf(song.bank, song.mix, lane)));
    const raw = [], trimmed = [];
    for (const c of v.rollChoices(part)) {
      const d = level(soundOf({ id: c.id })) - own;
      if (!Number.isFinite(d)) continue;
      const t = v.trimFor(lane, c.id);
      if (t > MAX_LEVEL_MOVE || t < -12) clampedRight = false;
      if (-d > MAX_LEVEL_MOVE || -d < -12) beyond++;
      raw.push(d); trimmed.push(d + t);
    }
    if (raw.length > 1) spreads.push({ raw: Math.max(...raw) - Math.min(...raw), trimmed: Math.max(...trimmed) - Math.min(...trimmed) });
  }
}
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const rawMed = median(spreads.map((s) => s.raw)), trimMed = median(spreads.map((s) => s.trimmed));
assert(spreads.length > 40 && trimMed < 0.5 && rawMed > 2 * trimMed + 1 && spreads.every((s) => s.trimmed <= s.raw + 0.15),
  `a part's sounds land together on its fader: median spread ${rawMed.toFixed(1)} dB untrimmed, ${trimMed.toFixed(1)} dB trimmed, over ${spreads.length} parts`);
assert(clampedRight, `a trim goes up no more than ${MAX_LEVEL_MOVE} dB and down no more than 12 (${beyond} sounds asked for more)`);

// The mix a swap plays: only the swapped lane's fader moved, by its trim; the song's own sounds
// are the song's own mix, untouched; and a kept song plays its swap at the same level.
{
  const song = makeBanger({ notes: NOTES, mode: 'simple', style: 'synthwave', seed: 3, voltage: 1, expression: 3 });
  const rec = { style: 'synthwave' };
  const v = new ClubVoices(song, rec);
  const lane = v.partLane('lead');
  const choices = v.rollChoices('lead');
  const k = choices.findIndex((c, i) => i > 0 && v.trimFor(lane, c.id) !== 0);
  const id = choices[k]?.id;
  const trim = v.trimFor(lane, id);
  const own = v.mixFor(v.state);
  const state = { swapped: false, picks: { own: { lead: k }, swap: {} } };
  const mix = v.mixFor(state);
  const others = Object.keys(song.mix.lanes).filter((l) => l !== lane).every((l) => mix.lanes[l] === song.mix.lanes[l]);
  const want = Math.round(((song.mix.lanes[lane]?.gain ?? 0) + trim) * 10) / 10;
  assert(k > 0 && own === song.mix && v.trimFor(lane, choices[0].id) === 0 && mix.voice[`${lane}Voice`] === id
    && mix.lanes[lane].gain === want && others,
  `a swapped lead lands with its fader moved by its trim (${trim} dB), every other lane as the song has it`);
  const kept = mixWithKept(song, rec, v.picksNamed(state));
  assert(kept.lanes[lane].gain === want, 'a kept song plays its swapped sound at the same level, in the Lab and on the jukebox');

  // Live: the strip moves at the step the swap lands on, and back when the song's own sound returns.
  const real = { re: Audio.reapplyBank, source: Audio.sourceBank, bank: Audio.bank, ctx: Audio.ctx, next: Audio.nextTime,
    mixer: Audio._mixer, entry: Audio.mixEntry };
  const ramps = [];
  Audio.mixer = { lane: (key) => ({ rampTo: (target, when) => ramps.push({ key, ...target, when }) }) };
  Audio.reapplyBank = (bank, m) => { Audio.mixEntry = m; };
  Audio.sourceBank = song.bank; Audio.bank = song.bank;
  Audio.ctx = { currentTime: 1 }; Audio.nextTime = 2.5;
  v.apply(state);
  const on = ramps.splice(0);
  v.release();
  const off = ramps.splice(0);
  assert(on.length === 1 && on[0].key === lane && on[0].gain === want && on[0].when === 2.5 && !on[0].mute
    && off.length === 1 && off[0].gain === (song.mix.lanes[lane]?.gain ?? 0),
  'live, the lane\'s strip takes the trim at the step the swap lands on, and gives it back with the song\'s own sound');
  Audio.reapplyBank = real.re; Audio.sourceBank = real.source; Audio.bank = real.bank;
  Audio.ctx = real.ctx; Audio.nextTime = real.next; Audio.mixer = real.mixer; Audio.mixEntry = real.entry;
}

if (failed) { console.error('\nclub-voice-levels: FAILED'); process.exit(1); }
console.log('\nclub-voice-levels: all passed');
