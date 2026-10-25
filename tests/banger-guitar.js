// MAKE A BANGER — THE GUITARS (tools/lib/banger/guitar.js, 24 Oct 2026). Peter: "any guitar chords
// should have a strum option built in, e.g. nylon classical for Shibuya-kei", and Chic-style
// sixteenth-note strumming for the funk and disco guitars, for variety.
//
//   1. the guitar rule: which presets are guitars
//   2. guitar chords strum: on chord parts, not single-note parts; in the style's feel; a seed's
//      setting wins; a non-guitar gets none
//   3. the strummed funk guitar: the hand keeps its parity in every bar, one note to a string, the
//      part evolves by section, Guitar forces each mode and Random is seeded
//   4. kept bangers — Lab recipes and desk takes from before — are made exactly as they were
//   5. the Lab club's sound swaps strum and unstrum with the sound
import { createHash } from 'node:crypto';
import { installDom } from './dom-stub.js';
installDom();

const G = await import('../tools/lib/banger/guitar.js');
const { generateBanger, BANGER_GROUPS, BANGER_REROLLS, normaliseBangerOptions, styleFor, BANGER_STYLES, BANGER_MOODS } = await import('../tools/lib/banger/index.js');
const { WAYS_ERA } = await import('../tools/lib/banger/ways.js');
const { VOICES } = await import('../src/data/voices.js');
const { Rng } = await import('../src/engine/rng.js');
const { riffFromNotes, DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
const { makeBanger, RECIPE_EXPRESSION } = await import('../src/game/banger/make.js');
const { ClubVoices, laneBars } = await import('../src/game/banger/club-voices.js');
const { midi } = await import('../tools/lib/banger/theory.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const RIFF = riffFromNotes(DEFAULT_SIMPLE, 'simpleSquare', 'simple');
const make = (options, seed = 7, riff = RIFF) => generateBanger({ riff, seed, options });
const fxOf = (out, role) => out.mix.lanes[out.laneOf[role]]?.noteFx || null;
const voiceOf = (out, role) => out.mix.voice[`${out.laneOf[role]}Voice`];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tones = (v) => (v == null ? [] : [...new Set([].concat(v))]);

// ---------------------------------------------------------------- 1. the guitar rule
{
  const missing = G.GUITAR_PRESETS.filter((id) => !VOICES[id]);
  assert(!missing.length && G.GUITAR_PRESETS.every((id) => G.isGuitarVoice(id)),
    `every listed guitar is a library preset and reads as a guitar (${G.GUITAR_PRESETS.length}${missing.length ? `; missing ${missing.join(' ')}` : ''})`);
  const frpp = ['frppNylon', 'frppNylonShimmer', 'frppSteelAcoustic', 'frppSteelAcousticShimmer', 'frppTwelveString', 'frppCleanElectric',
    'frppCleanElectricShimmer', 'frppElectricNeck', 'frppElectricBridge', 'frppFunkRhythm', 'frppFunkBright', 'frppFunkMuted', 'frppPalmMuted',
    'frppSlideGuitar', 'frppBanjo', 'frppMandolin'];
  assert(frpp.every((id) => G.isGuitarVoice(id)), 'the FRPP-6 guitars are guitars');
  assert(['mrdrWahGuitar', 'mrdrFunkGuitar', 'mrdrAcousticGuitar', 'rm7NylonGuitar', 'rm7JazzGuitar'].every((id) => G.isGuitarVoice(id)),
    'so are the MRDR-3 and RMND-7 guitars');
  const not = ['frppHarp', 'frppHarpShimmer', 'harpPluck', 'tngrWireHarp', 'frppKoto', 'koto', 'frppKalimba', 'tpKalimba', 'frppDulcimer',
    'frppSitar', 'tpBassGuitar', 'frppBassNeck', 'frppBassBridge', 'frppFretlessBass', 'epiano', 'clav', 'mrdrElectricGrand'].filter((id) => VOICES[id]);
  assert(not.length >= 14 && not.every((id) => !G.isGuitarVoice(id)), `harp, koto, kalimba, dulcimer, sitar, the bass guitars and the keys are not (${not.length})`);
  // the catalogue sweep: every tone preset whose name says Guitar, bar the basses, is one — and nothing else is, beyond the list
  const named = Object.entries(VOICES).filter(([, v]) => v.kind === 'tone' && /\bguitar\b/i.test(v.label || '') && v.category !== 'Bass' && !/bass/i.test(v.label));
  const extra = Object.keys(VOICES).filter((id) => G.isGuitarVoice(id) && !G.GUITAR_PRESETS.includes(id) && !/\bguitar\b/i.test(VOICES[id].label || ''));
  assert(named.every(([id]) => G.isGuitarVoice(id)) && !extra.length, `every catalogue preset named a guitar is one (${named.length}), and nothing unnamed beyond the list (${extra.join(' ') || 'none'})`);
  assert(G.isGuitarVoice({ label: 'Funk Guitar · Nu-Disco', kind: 'tone', synth: 'FRPP-6' }) && G.isGuitarVoice({ ...VOICES.frppNylon, id: 'frppNylon' })
    && !G.isGuitarVoice({ label: 'Bass Guitar', kind: 'tone', category: 'Bass' }) && !G.isGuitarVoice(null),
  'a song\'s own copy is read by its id or its name');
}

// ---------------------------------------------------------------- 2. guitar chords strum
{
  // Shibuya-Kei: the nylon guitar comps the chords (Chords = Piano Stabs) — strummed down, gently
  const shibuya = make({ style: 'shibuya' });
  const fx = fxOf(shibuya, 'piano');
  assert(voiceOf(shibuya, 'piano') === 'frppNylon' && same(fx?.guitar, { enabled: true, style: 'auto', position: 0 })
    && same(fx?.strum, { enabled: true, direction: 'up', gapMs: 20, downDb: 0, upDb: 0 }),
  `Shibuya-Kei's nylon chords get the six-string voicing and a gentle down-strum, 20 ms (${JSON.stringify(fx)})`);
  assert(/Guitar chords strummed on GUITAR Bossa/.test(shibuya.note), 'and the take\'s note says so');
  // the feel by style
  const feel = (id) => G.chordStrumFx(styleFor(id)).strum;
  assert(feel('reggaeton').direction === 'alternate-up' && feel('reggaeton').gapMs === 12 && feel('reggaeton').downDb === -3 && feel('reggaeton').upDb === 0
    && same(feel('reggaeton-romantico'), feel('reggaeton')),
  'Reggaeton strums down and up, 12 ms, the up-strokes 3 dB under — Romántico too');
  assert(['electro-funk', 'electro-funk-newjack', 'french-house', 'nu-disco'].every((id) => feel(id).direction === 'alternate-up'
    && feel(id).gapMs >= 6 && feel(id).gapMs <= 8 && feel(id).downDb === -4 && feel(id).upDb === 0), 'the funk and disco styles strum tight, down and up, the up-strokes 4 dB under');
  assert(same(feel('big-room'), { enabled: true, direction: 'up', gapMs: 14, downDb: 0, upDb: 0 }), 'any other style a plain down-strum, 14 ms');
  // the flavours, by their own rows: Clásico strums its guitar chords down and up; Romántico picks its nylon (the
  // arp, single notes) over a pad, unstrummed; Perreo's chords are clav stabs, which are no guitar
  const clasico = make({ style: 'reggaeton' });
  const romantico = make({ style: 'reggaeton', flavour: 'romantico' });
  const perreo = make({ style: 'reggaeton', flavour: 'perreo' });
  assert(G.isGuitarVoice(voiceOf(clasico, 'piano')) && fxOf(clasico, 'piano')?.strum?.direction === 'alternate-up'
    && voiceOf(romantico, 'arp') === 'frppNylon' && !fxOf(romantico, 'arp') && !G.isGuitarVoice(voiceOf(perreo, 'piano')) && !fxOf(perreo, 'piano'),
  'each flavour as its sounds are: Clásico\'s guitar chords strummed, Romántico\'s picked nylon and Perreo\'s clav not');
  // a fusion: Shibuya-Kei's sound over Deep House's groove keeps the nylon guitar, and its strum
  const fused = make({ style: 'deep-house', infusion: 'shibuya' });
  assert(G.isGuitarVoice(voiceOf(fused, 'piano')) && fxOf(fused, 'piano')?.strum?.gapMs === 20, 'an infusion\'s guitar chords strum in the sound\'s feel');
  // a mood's sound: Flamenco plays its chords on a nylon guitar in any style
  const flamenco = make({ style: 'big-room', mood: 'flamenco', parts: { chords: 'piano', guitar: 'random' } });
  assert(voiceOf(flamenco, 'piano') === 'frppNylon' && fxOf(flamenco, 'piano')?.strum?.enabled, 'a mood\'s guitar on the chords strums');
  // not on single notes: the picked arp, a hook played on a guitar
  const picked = make({ style: 'nu-disco', parts: { guitar: 'picked' } });
  assert(G.isGuitarVoice(voiceOf(picked, 'arp')) && !fxOf(picked, 'arp'), 'a guitar picking single notes (the arp) is not strummed');
  const nylonHook = make({ style: 'shibuya' }, 7, riffFromNotes(DEFAULT_SIMPLE, 'frppNylon', 'simple'));
  assert(voiceOf(nylonHook, 'hook') === 'frppNylon' && !fxOf(nylonHook, 'hook')?.strum && fxOf(nylonHook, 'piano')?.strum,
    'nor is a hook on a guitar — the chords beside it are');
  assert(G.playsChords([{ notes: [['A3', 'C4', 'E4'], null, ['A3', 'C4', 'E4'], 'A4'], lens: [] }]) && !G.playsChords([{ notes: ['A4', 'C5', ['A4', 'E5'], 'B4'], lens: [] }]),
    'a part plays chords when most of its hits are chords');
  // a non-guitar on the chords gets none
  const grand = make({ style: 'big-room', parts: { chords: 'piano', guitar: 'random' } });
  assert(!G.isGuitarVoice(voiceOf(grand, 'piano')) && !fxOf(grand, 'piano'), 'chords on a piano get no strum');
  assert(Object.values(make({ style: 'trance' }).mix.lanes).every((s) => !s.noteFx?.strum && !s.noteFx?.guitar), 'nor does anything in a style with no guitar');
  // the seed wins: a channel that already strums keeps its own
  const own = { enabled: true, direction: 'up', gapMs: 30, downDb: 0, upDb: 0 };
  const { BANGER_CHANNELS } = await import('../tools/lib/banger/channels.js');
  const channels = { ...BANGER_CHANNELS, shibuya: { ...(BANGER_CHANNELS.shibuya || {}), strips: { ...(BANGER_CHANNELS.shibuya?.strips || {}),
    piano: { ...(BANGER_CHANNELS.shibuya?.strips?.piano || styleFor('shibuya').strips.piano), noteFx: { strum: own } } } } };
  const seeded = generateBanger({ riff: RIFF, seed: 7, options: { style: 'shibuya' }, channels });
  assert(same(fxOf(seeded, 'piano')?.strum, own) && fxOf(seeded, 'piano')?.guitar?.enabled, 'a seed channel\'s own strum stays as it set it (the voicing it did not set is added)');
  const seededBoth = generateBanger({ riff: RIFF, seed: 7, options: { style: 'shibuya' }, channels: { ...channels, shibuya: { ...channels.shibuya,
    strips: { ...channels.shibuya.strips, piano: { ...channels.shibuya.strips.piano, noteFx: { strum: own, guitar: { enabled: false, style: 'open', position: 3 } } } } } } });
  assert(same(fxOf(seededBoth, 'piano'), { strum: own, guitar: { enabled: false, style: 'open', position: 3 } }), 'and one that set both keeps both, even switched off');
  // the strum and voicing are a lane setting merged in: Auto Portamento's place untouched
  assert(G.restrumNoteFx({ portamento: { enabled: true } }, { voice: 'frppNylon', chords: true, style: styleFor('shibuya') }).portamento.enabled
    && G.restrumNoteFx(G.chordStrumFx(styleFor('shibuya')), { voice: 'clav', chords: true, style: styleFor('shibuya') }) === undefined
    && same(G.restrumNoteFx({ strum: own }, { voice: 'clav', chords: true, style: styleFor('shibuya') }), { strum: own }),
  'restrumming a lane: on for a guitar, off for anything else — and only the generator\'s own setting moves');
}

// ---------------------------------------------------------------- 3. the strummed funk guitar
{
  // the hand: every pattern at every density alternates down and up from a down-stroke, lane by lane
  const all = [];
  for (const [id, pat] of Object.entries(G.FUNK_HANDS)) {
    for (const d of Object.keys(G.CHUCK_DENSITIES)) {
      const h = G.handBar(pat, d);
      all.push({ id, d, ok: G.keepsTheHand(h.stabs.map(([s]) => s)) && G.keepsTheHand(h.chucks), stabs: h.stabs.length, chucks: h.chucks.length,
        clash: h.chucks.some((s) => h.stabs.some(([t]) => t === s)) });
    }
  }
  assert(all.every((x) => x.ok && !x.clash), `every hand keeps its parity at every density, and no chuck lands on a stab (${all.length})`);
  const count = (id, d) => all.find((x) => x.id === id && x.d === d).chucks;
  assert(Object.keys(G.FUNK_HANDS).every((id) => count(id, 'none') === 0 && count(id, 'light') < count(id, 'full')),
    'the chucks thin out from full to light, and a build has none');
  const stabs = (id) => all.find((x) => x.id === id && x.d === 'full').stabs;
  assert(Object.keys(G.FUNK_HANDS).length >= 4 && Object.keys(G.FUNK_HANDS).length <= 6 && stabs('sparse') <= 3 && stabs('busy') >= 7,
    `four to six hands, a sparse one and a busy one (${Object.keys(G.FUNK_HANDS).join(' ')})`);
  let threw = false;
  try { G.handBar('XX.X............'); } catch { threw = true; }
  assert(threw, 'a hand whose stabs break the parity is refused');
  assert(G.FUNK_SETS.length >= 3 && G.FUNK_SETS.every((s) => [...s.main, ...s.peak, ...s.quiet].every((h) => G.FUNK_HANDS[h]) && ['frppFunkRhythm', 'frppFunkBright'].includes(s.stab)),
    'every pattern set names hands there are, and stabs on a funk guitar');

  // the voicings: top four strings, one note to a string, the third and seventh in, no root needed
  const dm9 = G.funkVoicing('Dm9', 60);
  const g13 = G.funkVoicing(G.funkChord('G7'), 60);
  assert(dm9.join(' ') === 'E3 A3 C4 F4' && g13.join(' ') === 'E3 A3 B3 F4' && G.funkChord('G7') === 'G13' && G.funkChord('Am') === 'Amadd9'
    && G.funkChord('Am', (s) => !/add9/.test(s)) === 'Am', `ii–V in C on the top strings: Dm9 ${dm9.join(' ')}, G13 ${g13.join(' ')} — a ninth or a thirteenth only where the key has it`);
  const syms = ['C', 'Cm', 'C7', 'Cmaj7', 'Cm7', 'Csus4', 'Cdim', 'Cm7b5', 'C6', 'C9'].flatMap((q) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    .map((r) => q.replace(/^C/, r)));
  const bad = syms.filter((s) => { const v = G.funkVoicing(G.funkChord(s), 60); return v.length < 2 || v.length > 4 || !G.oneNotePerString(v) || v.some((n) => midi(n) < 50 || midi(n) > 72); });
  assert(!bad.length, `every chord in every key voices on the top four strings, one note each (${syms.length}${bad.length ? `; ${bad.join(' ')}` : ''})`);
  assert(G.oneNotePerString(G.onTheStrings(['B3', 'D#4', 'F#4'])) && G.onTheStrings(['E3', 'A3', 'C4', 'G4']).join(' ') === 'E3 A3 C4 G4',
    'a chord a key lift knocked off the strings goes back on them; one on them stays');

  // made, in every funk and disco style and the Disco mood, Strummed
  const cases = [['electro-funk', 'funky'], ['electro-funk', 'moody'], ['french-house', 'funky'], ['nu-disco', 'nostalgic'], ['nu-disco', 'disco'],
    ['big-room', 'disco'], ['trance', 'disco'], ['eurobeat', 'funky']];
  const problems = []; let strikes = 0; let takes = 0;
  const lanesOf = (out) => Object.keys(out.mix.lanes).length;
  for (const [style, mood] of cases) {
    for (const seed of [1, 2, 3, 4]) {
      const extra = seed === 4 ? { form: { keyLift: 'third', keyApproach: 'twostep' } } : seed === 3 ? { energy: 'maximum' } : {};
      const out = make({ style, mood, parts: { guitar: 'strummed' }, ...extra }, seed);
      takes++;
      const stab = out.laneOf.arp; const chuck = out.laneOf.chuck;
      if (!stab || !chuck) { problems.push(`${style}/${mood}/${seed}: no strummed lanes`); continue; }
      const sv = out.mix.voice[`${stab}Voice`]; const cv = out.mix.voice[`${chuck}Voice`];
      if (!['frppFunkRhythm', 'frppFunkBright'].includes(sv) || cv !== 'frppFunkMuted') problems.push(`${style}/${mood}/${seed}: sounds ${sv} ${cv}`);
      for (const lane of [stab, chuck]) {
        const s = out.mix.lanes[lane];
        const st = s.noteFx?.strum;
        if (!(st?.enabled && st.direction === 'alternate-up' && st.downDb === -4 && st.upDb === 0 && st.gapMs >= 6 && st.gapMs <= 8) || s.noteFx?.guitar) problems.push(`${style}/${mood}/${seed} ${lane}: strum ${JSON.stringify(s.noteFx)}`);
        if (!(s.eq?.high > 0) || !(s.send?.reverb > 0)) problems.push(`${style}/${mood}/${seed} ${lane}: strip ${JSON.stringify(s)}`);
        // the bank as it plays: every strike keeps the hand, every chord one note to a string
        laneBars(out.bank, lane).forEach((part, b) => {
          if (!part) return;
          let k = 0;
          part.notes.forEach((v, i) => {
            const t = tones(v);
            if (t.length < 2) { if (t.length) problems.push(`${style}/${mood}/${seed} ${lane} bar ${b + 1}: a single note at ${i}`); return; }
            strikes++;
            if (i % 2 !== k % 2) problems.push(`${style}/${mood}/${seed} ${lane} bar ${b + 1}: strike ${k} on step ${i}`);
            if (t.length > 4 || !G.oneNotePerString(t)) problems.push(`${style}/${mood}/${seed} ${lane} bar ${b + 1}: ${t.join(' ')}`);
            k++;
          });
        });
      }
      if (!(Math.sign(out.mix.lanes[stab].pan) === -Math.sign(out.mix.lanes[chuck].pan) && out.mix.lanes[stab].pan !== 0)) problems.push(`${style}/${mood}/${seed}: not panned apart`);
      if (!(out.mix.lanes[chuck].gain < out.mix.lanes[stab].gain)) problems.push(`${style}/${mood}/${seed}: chucks ${out.mix.lanes[chuck].gain} not under stabs ${out.mix.lanes[stab].gain}`);
      // at most two guitar lanes more than the picked take, and the chucks follow the stabs' automation
      const pick = make({ style, mood, parts: { guitar: 'picked' }, ...extra }, seed);
      if (lanesOf(out) - lanesOf(pick) > 2) problems.push(`${style}/${mood}/${seed}: ${lanesOf(out) - lanesOf(pick)} lanes more`);
      if (!same(out.arrangement.automation?.[stab] ?? null, out.arrangement.automation?.[chuck] ?? null)) problems.push(`${style}/${mood}/${seed}: the chucks' automation is not the stabs'`);
    }
  }
  assert(!problems.length && strikes > 5000, `${takes} strummed takes: ${strikes} strikes keep the hand, one note to a string; two funk guitars panned apart, strummed down and up${problems.length ? `; ${problems.slice(0, 6).join('; ')}` : ''}`);

  // the part evolves: the chucks fullest in the drops, lighter in the breakdown, none in a build
  {
    const out = make({ style: 'big-room', mood: 'disco', parts: { guitar: 'strummed', arp: true } }, 11);
    const per = (role) => (sec) => {
      const bars = laneBars(out.bank, out.laneOf[role]).slice(sec.from - 1, sec.to).filter(Boolean);
      return bars.length ? bars.reduce((n, p) => n + p.notes.filter((v) => v != null).length, 0) / bars.length : null;
    };
    const chucks = per('chuck'); const stabsIn = per('arp');
    const drop = out.form.filter((f) => /drop/.test(f.role)).map(chucks).filter((x) => x != null);
    const build = out.form.filter((f) => /build/.test(f.role)).map((f) => [stabsIn(f), chucks(f)]).filter(([s]) => s != null);
    assert(drop.length && Math.max(...drop) >= 6 && build.length && build.every(([s, c]) => s > 0 && !c),
      `chucks fill the drops (${drop.map((x) => x.toFixed(1)).join(', ')} a bar) and leave the builds to the stabs alone`);
    const groove = make({ style: 'nu-disco', mood: 'disco', parts: { guitar: 'strummed' } }, 3);
    const gc = (sec) => { const bars = laneBars(groove.bank, groove.laneOf.chuck).slice(sec.from - 1, sec.to).filter(Boolean); return bars.length ? bars.reduce((n, p) => n + p.notes.filter((v) => v != null).length, 0) / bars.length : null; };
    const full = groove.form.filter((f) => f.hook).map(gc).filter((x) => x != null);
    const quiet = groove.form.filter((f) => !f.hook).map(gc).filter((x) => x != null);
    assert(full.length && quiet.length && Math.min(...full) > Math.max(...quiet), `in a Groove, more chucks in its fullest sections (${full.map((x) => x.toFixed(1)).join(', ')}) than on the way up (${quiet.map((x) => x.toFixed(1)).join(', ')})`);
  }

  // Guitar forces each mode
  const strummed = make({ style: 'electro-funk', parts: { guitar: 'strummed' } });
  const pickedEf = make({ style: 'electro-funk', parts: { guitar: 'picked' } });
  assert(strummed.laneOf.arp && strummed.laneOf.chuck && /Guitar: Strummed/.test(strummed.note) && !pickedEf.laneOf.arp && !pickedEf.laneOf.chuck,
    'Strummed plays the strummed guitar even where the Arp is off (Boogie); Picked leaves it as it was');
  const pickedNd = make({ style: 'nu-disco', parts: { guitar: 'picked' } });
  assert(voiceOf(pickedNd, 'arp') === 'frppSteelAcoustic' && !pickedNd.laneOf.chuck && /Guitar: Picked/.test(pickedNd.note), 'Picked keeps the picked arp guitar');
  const none = make({ style: 'trance', parts: { guitar: 'strummed' } });
  assert(!none.laneOf.chuck && voiceOf(none, 'arp') === voiceOf(make({ style: 'trance', parts: { guitar: 'picked' } }), 'arp') && !/Guitar:/.test(none.note),
    'where the arp is no funk guitar, Strummed has nothing to change');
  // Picked is the arp exactly as it was: the music and the arp's channel as an era-4 take's
  const era4 = make({ style: 'nu-disco', waysEra: 4, parts: { guitar: 'picked' } });
  assert(same(pickedNd.bank, era4.bank) && same(pickedNd.mix.lanes[pickedNd.laneOf.arp], era4.mix.lanes[era4.laneOf.arp]),
    'and Picked plays the very notes and arp channel a take before the guitars did');

  // Random is seeded: the same seed draws the same, and the odds lean as the style and mood say
  const { resolveSounds } = await import('../tools/lib/banger/sound-rules.js');
  const { BANGER_SOUNDS } = await import('../tools/lib/banger/sounds.js');
  const draw = (style, mood, seed) => G.planGuitar({ asked: 'random', era: WAYS_ERA, style: styleFor(style), mood,
    arpSound: resolveSounds(BANGER_SOUNDS, style, mood).parts.arp, rng: new Rng(seed).stream('guitar') });
  const seeds = Array.from({ length: 400 }, (_, i) => (i * 2654435761 + 17) >>> 0 || 1);
  const share = (style, mood) => seeds.filter((s) => draw(style, mood, s)?.strummed).length / seeds.length;
  const rates = { ef: share('electro-funk', 'funky'), fh: share('french-house', 'funky'), nd: share('nu-disco', 'nostalgic'), disco: share('big-room', 'disco'), mystery: share('big-room', 'mystery') };
  assert(Math.abs(rates.ef - 0.7) < 0.07 && Math.abs(rates.fh - 0.65) < 0.07 && Math.abs(rates.nd - 0.6) < 0.07 && Math.abs(rates.disco - 0.65) < 0.07 && Math.abs(rates.mystery - 0.3) < 0.07,
    `Random leans Strummed in the funk styles and the Disco mood, Picked over another funk guitar's arp (${Object.entries(rates).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')})`);
  const sets = new Set(seeds.map((s) => draw('nu-disco', 'nostalgic', s)?.set));
  assert(sets.size === G.FUNK_SETS.length, `and draws every pattern set (${[...sets].join(' ')})`);
  assert(draw('trance', 'uplifting', 5) === null && draw('big-room', 'anthemic', 5) === null, 'never where the arp is no funk guitar');
  const takesOf = (seed) => make({ style: 'french-house', parts: { guitar: 'random' } }, seed);
  const a = takesOf(21); const b = takesOf(21);
  assert(same(a.bank, b.bank) && same(a.mix, b.mix) && seeds.slice(0, 12).every((s) => !!takesOf(s).laneOf.chuck === !!draw('french-house', 'funky', s)?.strummed),
    'a Random take is made the same every time, and plays what its seed drew');
  // the draw is its own stream: Strummed or Picked moves nothing else in the take
  const sAll = make({ style: 'nu-disco', parts: { guitar: 'strummed' } }, 9);
  const pAll = make({ style: 'nu-disco', parts: { guitar: 'picked' } }, 9);
  const others = (o) => Object.fromEntries(Object.entries(o.laneOf).filter(([r]) => r !== 'arp' && r !== 'chuck').map(([r, l]) => [r, laneBars(o.bank, l)]));
  assert(same(others(sAll), others(pAll)), 'every other part plays the same notes, Strummed or Picked');
  assert(BANGER_REROLLS.some((r) => r.stream === 'guitar'), 'Modify This Take can draw the guitar again on its own');

  // the option, on the desk
  const field = BANGER_GROUPS.find((g) => g.id === 'parts').fields.find((f) => f.key === 'guitar');
  assert(field?.type === 'select' && same(field.options.map(([id]) => id), ['random', 'picked', 'strummed']) && field.options[0][1] === 'Random',
    'Bass & Chords has a Guitar switch: Random, Picked, Strummed');
  assert(normaliseBangerOptions({ style: 'nu-disco' }).options.parts.guitar === 'random' && normaliseBangerOptions({ style: 'nu-disco', parts: { guitar: 'strummed' } }).options.parts.guitar === 'strummed'
    && normaliseBangerOptions({ style: 'nu-disco', parts: { guitar: 'loud' } }).issues.length === 1, 'a new request draws by default, says one outright, and a wrong one is reported');
  assert(G.guitarOffered('nu-disco', 'nostalgic') && G.guitarOffered('electro-funk', 'funky') && G.guitarOffered('french-house', 'lounge')
    && G.guitarOffered('big-room', 'disco') && G.guitarOffered('big-room', 'funky') && !G.guitarOffered('big-room', 'anthemic') && !G.guitarOffered('trance', 'uplifting'),
  'the desk offers it where the arp is a funk or disco guitar, and dims it elsewhere');
  const offered = BANGER_STYLES.flatMap((s) => BANGER_MOODS.filter((m) => G.guitarOffered(s, m.id)).map((m) => `${s.id}/${m.id}`));
  assert(offered.every((k) => /^(nu-disco|electro-funk|french-house)\//.test(k) || /\/(disco|funky|mystery)$/.test(k)), 'only in the funk and disco styles, and the Funky, Disco and Mystery moods\' guitars');
}

// ---------------------------------------------------------------- 4. kept bangers are made as they were
{
  // A Lab song is its recipe, made again whenever it plays. One kept before the guitars (expression 11) plays
  // no strum and no strummed guitar — and its notes and arrangement are pinned, as they were made before them.
  // (numbers to 12 significant figures: Node 22 and 26 disagree in the last bit of a note's frequency, and the
  // deploy runs 22 — the song is the same song either way.)
  const hash = (o) => createHash('sha1').update(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Number(v.toPrecision(12)) : v))).digest('hex').slice(0, 16);
  // (bank and arrangement hashed: what the guitars would change, and nothing a re-measured sound or level moves.
  // Recorded on the tree before the guitars were built.)
  const KEPT = {
    'shibuya/lounge/3': '1590f49ba4903614', 'nu-disco/disco/5': '546e766586f77504', 'electro-funk/funky/8': '0361c820387ed78e',
    'french-house/funky/2': '69f567d362f2044d', 'big-room/disco/13': '7dd26ef9605d33c7', 'reggaeton/moody/4': '23c7a1cc97bb1e15',
  };
  const got = {}; const strums = [];
  for (const key of Object.keys(KEPT)) {
    const [style, mood, seed] = key.split('/');
    const song = makeBanger({ notes: DEFAULT_SIMPLE, mode: 'simple', style, mood, seed: Number(seed), voltage: 2, expression: 11 });
    got[key] = hash({ bank: song.bank, arrangement: song.arrangement });
    if (Object.values(song.mix.lanes).some((s) => s.noteFx?.strum || s.noteFx?.guitar) || song.laneOf.chuck) strums.push(key);
  }
  const moved = Object.keys(KEPT).filter((k) => got[k] !== KEPT[k]);
  assert(!moved.length, `kept Lab songs from before the guitars play the same notes and arrangement${moved.length ? ` (moved: ${moved.map((k) => `${k} ${got[k]}`).join(', ')})` : ''}`);
  assert(!strums.length, `and strum nothing, with no strummed guitar (${strums.join(' ') || 'none'})`);
  // a desk take: its saved options name its parts but no Guitar — made as it was, Picked, nothing strummed
  const old = normaliseBangerOptions({ style: 'shibuya', parts: { bass: 'offbeat' } }).options;
  assert(old.parts.guitar === 'picked' && old.waysEra <= 4 && normaliseBangerOptions({ style: 'shibuya', waysEra: 2, parts: {} }).options.waysEra === 2,
    'a desk request that names its parts but no Guitar was made before the guitars: Picked, Ways Era 4 at most');
  const desk = make(old);
  const deskEra4 = make({ ...old, waysEra: 4 });
  assert(!fxOf(desk, 'piano') && same(desk.bank, deskEra4.bank) && same(desk.mix, deskEra4.mix), 'so a desk take re-made from it strums nothing, as it did');
  // and a new Lab recipe is the guitars' era
  const fresh = makeBanger({ notes: DEFAULT_SIMPLE, mode: 'simple', style: 'shibuya', mood: 'lounge', seed: 3, voltage: 1, expression: RECIPE_EXPRESSION });
  assert(RECIPE_EXPRESSION >= 12 && fresh.waysEra === WAYS_ERA && fxOf(fresh, 'piano')?.strum?.enabled, 'a new Lab recipe strums Shibuya-Kei\'s nylon guitar');
}

// ---------------------------------------------------------------- 5. the Lab club's sound swaps
{
  const NOTES = DEFAULT_SIMPLE;
  // nu-disco's chord sounds include guitars: a swap onto one strums, a swap off one stops
  const song = makeBanger({ notes: NOTES, mode: 'simple', style: 'reggaeton', mood: 'uplifting', seed: 3, voltage: 1, expression: RECIPE_EXPRESSION });
  const v = new ClubVoices(song, { style: 'reggaeton' });
  const list = v.choices('chords', false);
  const lane = v.partLane('chords');
  const at = (pred) => list.findIndex((c, i) => i > 0 && pred(c.id));
  const off = at((id) => !G.isGuitarVoice(id));
  const own = song.mix.lanes[lane]?.noteFx;
  assert(G.isGuitarVoice(list[0].id) && own?.strum?.enabled && off > 0, `the take's chords are a strummed guitar (${list[0].id}), with other sounds to swap to`);
  const swapped = v.mixFor({ swapped: false, picks: { own: { chords: off }, swap: {} } });
  assert(!swapped.lanes[lane].noteFx?.strum && !swapped.lanes[lane].noteFx?.guitar && same(song.mix.lanes[lane].noteFx, own),
    `swapped onto ${list[off].id}, the chords stop strumming — and the song's own mix is untouched`);
  const back = v.mixFor({ swapped: false, picks: { own: {}, swap: {} } });
  assert(same(back.lanes[lane].noteFx, own), 'and back on the guitar they strum again');
  // a take whose chords are not a guitar, swapped onto one
  const keys = makeBanger({ notes: NOTES, mode: 'simple', style: 'nu-disco', mood: 'nostalgic', seed: 4, voltage: 1, expression: RECIPE_EXPRESSION });
  const kv = new ClubVoices(keys, { style: 'nu-disco' });
  const klist = kv.choices('chords', false);
  const klane = kv.partLane('chords');
  const on = klist.findIndex((c, i) => i > 0 && G.isGuitarVoice(c.id));
  const chordal = G.playsChords(laneBars(keys.bank, klane));
  if (on > 0 && chordal && !G.isGuitarVoice(klist[0].id)) {
    const m = kv.mixFor({ swapped: false, picks: { own: { chords: on }, swap: {} } });
    assert(same(m.lanes[klane].noteFx?.strum, G.chordStrumFx(styleFor('nu-disco')).strum), `chords swapped onto ${klist[on].id} strum in the style's feel`);
  } else assert(true, `(nu-disco's chords here: ${klist[0].id}, ${chordal ? 'chords' : 'held notes'} — no guitar swap to try)`);
  // a song kept before the guitars keeps its strip as it was, whatever it is swapped to
  const old = makeBanger({ notes: NOTES, mode: 'simple', style: 'reggaeton', mood: 'uplifting', seed: 3, voltage: 1, expression: 11 });
  const ov = new ClubVoices(old, { style: 'reggaeton' });
  const olane = ov.partLane('chords');
  const states = ov.choices('chords', false).map((_, k) => ov.mixFor({ swapped: false, picks: { own: k ? { chords: k } : {}, swap: {} } }));
  assert(states.every((m) => !m.lanes[olane]?.noteFx), 'a song kept before the guitars strums nothing, on any sound');
}

console.log(failed ? '\nbanger guitar: FAILED' : '\nbanger guitar: all passed');
process.exit(failed ? 1 : 0);
