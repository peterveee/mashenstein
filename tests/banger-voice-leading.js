// VOICE LEADING — the chord parts' coloured chords, each moving least from the one before, with no
// needless semitone clusters (tools/lib/banger/voice-leading.js, generator v9, 7 Oct 2026). Held
// here: the voicings Peter chose in the A/B; triads, open voicings and the riff as written left as
// they were placed; a loop that plays the same each time round; a part shared between bars never
// changed under the other; and, across every style's coloured moods, no chord keeping a cluster it
// could lose or straying outside its band.
const { leadVoicing, voiceLeadChords, VOICE_LED_ROLES } = await import('../tools/lib/banger/voice-leading.js');
const { generateBanger, BANGER_GENERATOR_VERSION } = await import('../tools/lib/banger/index.js');
const { BANGER_STYLES, styleFor, flavourOf } = await import('../tools/lib/banger/styles/index.js');
const { LIFT_SEMIS } = await import('../tools/lib/banger/sections.js');
const { midi, nameOf, voicing, padBar } = await import('../tools/lib/banger/theory.js');
const { riffFromNotes } = await import('../src/game/banger/riff.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const names = (n) => n.map(nameOf).join(' ');
const pcs = (sym) => [...new Set(voicing(sym, 'C4').map((n) => midi(n) % 12))].sort((a, b) => a - b);
const M = (s) => s.split(' ').map(midi);

// ---------------------------------------------------------------- the voicings Peter heard
{
  assert(names(leadVoicing(pcs('Gmaj7'), midi('A4'), null)) === 'G4 B4 D5 F#5',
    'Gmaj7 on the trance saws: G4 B4 D5 F#5, not the F#4 G4 cluster the centre alone gives');
  assert(voicing('Gmaj7', 'A4').join(' ') === 'F#4 G4 B4 D5', '…which is what the close voicer still gives on its own');
  assert(names(leadVoicing(pcs('Cmaj7'), midi('D4'), M('A3 C4 E4 G4'))) === 'C4 E4 G4 B4',
    'Cmaj7 after Am7 on the eurodance pad: C4 E4 G4 B4, not B3 C4 E4 G4');
  assert(names(leadVoicing(pcs('Fmaj7'), midi('D4'), M('A3 C4 E4 G4'))) === 'F3 A3 C4 E4', 'Fmaj7 after Am7: F3 A3 C4 E4');
  assert(names(leadVoicing(pcs('Am7'), midi('D4'), M('C4 E4 G4 B4'))) === 'C4 E4 G4 A4', 'Am7 after Cmaj7 C4 E4 G4 B4: one voice moves, B to A');
  const held = leadVoicing(pcs('Em9'), midi('E4'), null);
  assert(names(leadVoicing(pcs('Em9'), midi('E4'), held)) === names(held), 'a chord after itself stays where it is');
  assert(leadVoicing(pcs('Cmaj7'), midi('C2') - 40, null) === null, 'no close voicing within the band: none offered (the chord keeps its own)');
}

// ---------------------------------------------------------------- what is left alone, and the loop
{
  const centres = { pad: 'E4', piano: 'E4' };
  const form = [{ from: 1, to: 8 }];
  // A two-bar progression, four times: Am7 → Cmaj7 on a pad about D4, as the close voicer places
  // them (the Cmaj7 as B3 C4 E4 G4).
  const bars = Array.from({ length: 8 }, (_, i) => ({ pad: padBar(i % 2 ? 'Cmaj7' : 'Am7', 'D4') }));
  const before = JSON.stringify(bars);
  const moved = voiceLeadChords(bars, form, { centres: { pad: 'D4' } });
  const at = (b, role = 'pad') => bars[b][role].notes[0].join(' ');
  assert(moved > 0 && JSON.stringify(bars) !== before && at(1) === 'C4 E4 G4 B4', 'a coloured progression is re-voiced: the Cmaj7 as C4 E4 G4 B4');
  assert([0, 2, 4, 6].every((b) => at(b) === at(0)) && [1, 3, 5, 7].every((b) => at(b) === at(1)),
    'the loop plays the same each time round: each repeat of the progression starts afresh');

  const keep = [
    { pad: padBar('C', 'E4') },                                                  // a triad
    { pad: { notes: [['F3', 'C4', 'D#4', 'G#4'], ...Array(15).fill(null)], lens: [16, ...Array(15).fill(null)] } }, // open: an octave and more across
    { piano: { notes: [['B3', 'C4', 'E4', 'G4'], ...Array(15).fill(null)], lens: [16, ...Array(15).fill(null)] } }, // the riff as written
  ];
  const kept = JSON.stringify(keep);
  voiceLeadChords(keep, [{ from: 1, to: 3 }], { centres, asWritten: new Set(['2:piano']) });
  assert(JSON.stringify(keep) === kept, 'a triad, an open voicing and the riff as written (even a cluster) stay as placed');

  const shared = padBar('Cmaj7', 'E4');
  const was = JSON.stringify(shared);
  const two = [{ pad: padBar('Am7', 'E4') }, { pad: shared }, { pad: shared }];
  voiceLeadChords(two, [{ from: 1, to: 1 }, { from: 2, to: 3 }], { centres });
  assert(JSON.stringify(shared) === was, 'a part shared between bars is copied before it changes, never changed in place');

  // Am7 placed about E4, then the section lifted a whole tone: Bm7, voiced about F#4.
  const lifted = [{ pad: padBar('Am7', 'E4') }];
  lifted[0].pad.notes[0] = lifted[0].pad.notes[0].map((n) => nameOf(midi(n) + 2));
  voiceLeadChords(lifted, [{ from: 1, to: 1 }], { centres, liftOf: () => 2 });
  assert(lifted[0].pad.notes[0].join(' ') === names(leadVoicing(pcs('Bm7'), midi('F#4'), null)),
    'in a lifted section the band is about the centre lifted with it');
  assert(VOICE_LED_ROLES.join() === 'saws,pad,piano,choir', 'the voice-led parts are the saws, pad, piano and choir');
}

// ---------------------------------------------------------------- the generator
const BAND = 4;
const clusters = (n) => n.slice(1).filter((m, i) => m - n[i] === 1).length;
function closeVoicings(set) {
  const out = [];
  for (let r = 0; r < set.length; r++) {
    const rot = [...set.slice(r), ...set.slice(0, r)];
    for (let oct = 1; oct <= 7; oct++) {
      const n = [rot[0] + 12 * oct]; let m = n[0];
      for (const pc of rot.slice(1)) { m += 1; while (m % 12 !== pc) m++; n.push(m); }
      out.push(n);
    }
  }
  return out;
}
const isTriad = (set) => set.length === 3 && set.some((r) => ['0,4,7', '0,3,7'].includes(set.map((p) => (p - r + 12) % 12).sort((a, b) => a - b).join()));
{
  const riff = riffFromNotes([7, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1], 'simpleSquare', 'simple');
  const one = generateBanger({ riff, seed: 3, options: { style: 'trance', mood: 'nostalgic' } });
  assert(BANGER_GENERATOR_VERSION === 10 && one.banger.generator === 10, 'generator v10, and a take records it');

  let takes = 0, coloured = 0, avoidable = 0, outside = 0;
  for (const st of BANGER_STYLES) {
    for (const [mood, m] of Object.entries(st.moods || {})) {
      if (!m.colour || Object.entries(m.colour).every(([k, v]) => k === v)) continue;
      const s = generateBanger({ riff, seed: 3, options: { style: st.id, mood } });
      takes++;
      const o = s.banger.options;
      const recipe = styleFor(o.style);
      const played = flavourOf(recipe, o.flavour, { seed: s.banger.seed, mood: o.mood }) || recipe;
      const centres = played.centres;
      // CHORD MEMORY's stabs are one shape on purpose (9 Oct 2026) and never voice-led: not judged here.
      const memory = typeof played.chordMemory === 'string' ? played.chordMemory : played.chordMemory?.[o.mood];
      const fixedRole = memory ? ({ stabs: 'saws', none: null }[o.parts.chords] ?? o.parts.chords) : null;
      const lift = (bar1) => (s.form.find((f) => f.from <= bar1 && bar1 <= f.to)?.lifted ? LIFT_SEMIS[o.form.keyLift] || 0 : 0);
      for (const role of VOICE_LED_ROLES) {
        const lane = s.laneOf[role];
        if (!lane || !centres?.[role] || role === fixedRole) continue;
        s.bank.sections.forEach((sec, block) => (sec[lane] || []).forEach((v, step) => {
          if (!Array.isArray(v) || v.length < 3) return;
          const n = v.map((f) => Math.round(69 + 12 * Math.log2(f / 440))).sort((a, b) => a - b);
          const set = [...new Set(n.map((x) => x % 12))].sort((a, b) => a - b);
          if (n[n.length - 1] - n[0] >= 12 || set.length !== n.length || isTriad(set)) return;
          // The breakdown piano playing the hook as written is the riff's, not the generator's.
          const bar1 = block * 2 + Math.floor(step / 16) + 1;
          if (role === 'piano' && s.form.find((f) => f.from <= bar1 && bar1 <= f.to)?.role === 'breakdown') return;
          const centre = midi(centres[role]) + lift(bar1);
          const band = closeVoicings(set).filter((c) => Math.abs(c.reduce((a, b) => a + b, 0) / c.length - centre) <= BAND);
          if (!band.length) return;
          coloured++;
          if (clusters(n) > Math.min(...band.map(clusters))) avoidable++;
          if (Math.abs(n.reduce((a, b) => a + b, 0) / n.length - centre) > BAND) outside++;
        }));
      }
    }
  }
  assert(takes > 100 && coloured > 1000, `every style's coloured moods made (${takes} takes, ${coloured} coloured chords on the chord parts)`);
  assert(avoidable === 0, `no coloured chord keeps a semitone cluster it could lose (${avoidable})`);
  assert(outside === 0, `every coloured chord sits within ${BAND} semitones of its part's centre (${outside} outside)`);
}

// ---------------------------------------------------------------- the riff as written
{
  // A chord riff as the hook, cluster and all, on the trance breakdown's piano: played as written.
  const riff = { version: 1, source: { id: 'vl', title: 'VL', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
    parts: [{ key: 'lead', label: 'Keys', kind: 'chord', role: 'hook', meanPitch: 62, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null,
      bars: ['B3+C4+E4+G4:8 . . . . . . . A3+C4+E4+G4:8 . . . . . . .', 'F3+A3+C4+E4:8 . . . . . . . G3+B3+D4+F#4:8 . . . . . . .'] }] };
  const s = generateBanger({ riff, seed: 1, options: { style: 'trance', mood: 'moody', riffNotes: 'keep', parts: { writeLead: 'off' } } });
  const bd = s.form.find((f) => f.role === 'breakdown');
  const written = new Set(['B3 C4 E4 G4', 'A3 C4 E4 G4', 'F3 A3 C4 E4', 'G3 B3 D4 F#4']);
  const played = new Set();
  for (let b = bd.from; b <= bd.to; b++) {
    const row = s.bank.sections[Math.floor((b - 1) / 2)][s.laneOf.piano] || [];
    for (let i = ((b - 1) % 2) * 16; i < ((b - 1) % 2) * 16 + 16; i++) {
      if (Array.isArray(row[i])) played.add(row[i].map((f) => nameOf(Math.round(69 + 12 * Math.log2(f / 440)))).join(' '));
    }
  }
  assert(played.size === 4 && [...played].every((c) => written.has(c)), `the breakdown piano plays the riff's chords as written (${[...played].join(' / ')})`);
}

if (failed) process.exit(1);
