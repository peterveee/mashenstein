// Varied-ways auditions (generator v11): the same take played each way one moment of a banger can go —
// the breakdown's hook (breakdown-ways.js), a build, the bar before the drop, the riser (build-ways.js),
// the intro (intro-ways.js) — or a Groove's opening with Tune First off and on, from a couple of bars
// before that moment to a couple after. Real engine, the saved arrangement, no normalising.
//
//   node tools/render-banger-way-auditions.js <breakdown|breakdownNew|backing|build|dropIn|riser|riserFx|hit|intro|drop2|forms|groove> [style …]
//
// Writes work/auditions/banger-<topic>/<style>-<n>-<way>.wav, <style>-00-all.wav (every way in turn,
// two seconds apart) and a manifest. Everything else is held at its classic: Half Speed, the snare
// roll, straight in, the riff intro, the noise riser, the style's own drop hit.
import { mkdirSync, writeFileSync } from 'node:fs';
import { installDom } from '../tests/dom-stub.js';
installDom();
const { generateBanger } = await import('./lib/banger/index.js');
const { BREAKDOWN_WAYS, BACKING_WAYS } = await import('./lib/banger/breakdown-ways.js');
const { BUILD_WAYS, DROP_IN_WAYS, RISER_WAYS, RISER_FX_WAYS, DROP_HIT_WAYS } = await import('./lib/banger/build-ways.js');
const { INTRO_WAYS } = await import('./lib/banger/intro-ways.js');
const { DROP2_WAYS } = await import('./lib/banger/drop-ways.js');
const { FORM_TEMPLATES } = await import('./lib/banger/templates.js');
const { riffFromNotes, DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
const { hookSoundFor, defaultMoodFor } = await import('../src/game/banger/make.js');
const { openRenderer } = await import('./lib/render-bank-browser.js');
const { wavBuffer, rmsOf, SR } = await import('./lib/wav.js');

// Each topic: its ways, the switch it sets (`key` in the form, or `fx` in the effects, or `form` for a
// whole form), and the bars to hear (from, to — 1-based) in a song.
const drop1 = (form) => form.find((f) => f.role === 'drop');
const TOPICS = {
  breakdown: {
    dir: 'banger-breakdowns', ways: BREAKDOWN_WAYS.filter((w) => w.id !== 'written' && w.id !== 'none'), key: 'breakdownHook',
    span: (form) => { const s = form.find((f) => f.role === 'breakdown'); return s && [s.from - 2, s.to + 2]; },
  },
  // The breakdown hooks auditioned by name (not in Varied).
  breakdownNew: {
    dir: 'banger-breakdowns-new', ways: BREAKDOWN_WAYS.filter((w) => ['half', 'gated', 'octaveEcho', 'choir', 'low'].includes(w.id)), key: 'breakdownHook',
    span: (form) => { const s = form.find((f) => f.role === 'breakdown'); return s && [s.from - 2, s.to + 2]; },
  },
  // What plays under the breakdown's hook (Half Speed, held), each way.
  backing: {
    dir: 'banger-breakdown-backing', ways: BACKING_WAYS, key: 'breakdownBacking',
    span: (form) => { const s = form.find((f) => f.role === 'breakdown'); return s && [s.from - 2, s.to + 2]; },
  },
  drop2: {
    dir: 'banger-drop2', ways: DROP2_WAYS, key: 'drop2Way',
    span: (form) => { const s = form.find((f) => f.role === 'drop2'); return s && [s.from - 1, s.to + 1]; },
  },
  build: {
    dir: 'banger-builds', ways: BUILD_WAYS, key: 'buildWay',
    span: (form) => { const s = form.find((f) => f.role === 'build'); return s && [s.from - 2, s.to + 2]; },
  },
  dropIn: {
    dir: 'banger-drop-ins', ways: DROP_IN_WAYS, key: 'dropIn',
    span: (form) => { const s = form.find((f) => f.role === 'build'); return s && [s.to - 1, s.to + 2]; },
  },
  riser: {
    dir: 'banger-risers', ways: RISER_WAYS, fx: 'riserWay',
    span: (form) => { const d = drop1(form); return d && [d.from - 4, d.from + 1]; },
  },
  // Each Riser FX over the Noise Riser.
  riserFx: {
    dir: 'banger-riser-fx', ways: RISER_FX_WAYS, spot: 'riser',
    span: (form) => { const d = drop1(form); return d && [d.from - 3, d.from + 1]; },
  },
  hit: {
    dir: 'banger-drop-hits', ways: DROP_HIT_WAYS, fx: 'dropHit',
    span: (form) => { const d = drop1(form); return d && [d.from - 2, d.from + 1]; },
  },
  intro: {
    dir: 'banger-intros', ways: INTRO_WAYS, key: 'introWay',
    span: (form) => { const s = form.find((f) => f.role === 'intro'); return s && [s.from, s.to + 2]; },
  },
  // Whole songs, Medium, in each Club shape (templates.js) against the Club form — every way at its classic.
  forms: {
    dir: 'banger-forms', length: 'medium',
    ways: [{ id: 'club', label: 'Club' }, ...['double', 'fakeout', 'dropfirst', 'longbuild', 'peaks'].map((id) => ({ id, label: FORM_TEMPLATES[id].label }))],
    form: (way) => ({ template: way, breakdownHook: 'half', buildWay: 'roll', dropIn: 'straight', introWay: 'riff', drop2Way: 'more' }),
    span: (form) => [1, form[form.length - 1].to],
  },
  // A Groove's first twenty-four bars, Tune First off and on.
  groove: {
    dir: 'banger-grooves', styles: ['deep-house', 'techno', 'nu-disco'],
    ways: [{ id: 'before', label: 'Before (Tune First off)' }, { id: 'tunefirst', label: 'Tune First' }],
    form: (way) => ({ template: 'groove', tuneFirst: way === 'tunefirst' }),
    span: () => [1, 24],
  },
};
const [topicId, ...rest] = process.argv.slice(2);
const topic = TOPICS[topicId];
if (!topic) throw new Error(`which moment? ${Object.keys(TOPICS).join(' | ')}`);
const styles = rest.length ? rest : topic.styles || ['big-room', 'trance', 'electro'];
const SEED = 11;
const directory = new URL(`../work/auditions/${topic.dir}/`, import.meta.url);
mkdirSync(directory, { recursive: true });
const manifest = { note: `Each ${topicId} way on the same take, a couple of bars either side. Raw engine output.`, renders: [] };
const renderer = await openRenderer();
try {
  for (const style of styles) {
    const mood = defaultMoodFor(style);
    const riff = riffFromNotes(DEFAULT_SIMPLE, hookSoundFor(style, mood, SEED), 'simple');
    const reel = [];
    for (const [n, way] of topic.ways.entries()) {
      // The Club form, so every style has its moments in the same places.
      const form = topic.form ? topic.form(way.id)
        : { template: 'club', breakdownHook: 'half', buildWay: 'roll', dropIn: 'straight', introWay: 'riff', drop2Way: 'more', ...(topic.key ? { [topic.key]: way.id } : {}) };
      const fx = { riserWay: 'noise', dropHit: 'style', ...(topic.fx ? { [topic.fx]: way.id } : {}) };
      const spot = { riser: topic.spot ? way.id : 'none' };
      const song = generateBanger({ riff, seed: SEED, options: { style, mood, form, fx, spot, ...(topic.form ? { length: topic.length || 'long' } : {}) } });
      const span = topic.span(song.form);
      if (!span) throw new Error(`${style} has no ${topicId}`);
      const last = song.form[song.form.length - 1].to;
      const audio = await renderer.render(song.bank, { mix: song.mix, arrangement: song.arrangement, trackId: null,
        range: { startStep: Math.max(0, span[0] - 1) * 16, endStep: Math.min(last, span[1]) * 16 }, tail: 2 });
      if (!Number.isFinite(audio.peak) || audio.peak <= 0) throw new Error(`${style} ${way.id}: silent render`);
      const file = `${style}-${String(n + 1).padStart(2, '0')}-${way.id}.wav`;
      writeFileSync(new URL(file, directory), wavBuffer([audio.outL, audio.outR]));
      const entry = { file, style, way: way.id, label: way.label, bars: `${Math.max(1, span[0])}–${Math.min(last, span[1])}`,
        peakDb: +(20 * Math.log10(audio.peak)).toFixed(2), rmsDb: +(20 * Math.log10(Math.sqrt((rmsOf(audio.outL) ** 2 + rmsOf(audio.outR) ** 2) / 2))).toFixed(2) };
      manifest.renders.push(entry);
      reel.push(audio);
      console.log(`${file}: ${way.label}, bars ${entry.bars}, peak ${entry.peakDb} dBFS`);
    }
    const gap = 2 * SR;
    const join = (side) => {
      const out = new Float32Array(reel.reduce((t, a) => t + a[side].length + gap, 0));
      let at = 0;
      for (const a of reel) { out.set(a[side], at); at += a[side].length + gap; }
      return out;
    };
    writeFileSync(new URL(`${style}-00-all.wav`, directory), wavBuffer([join('outL'), join('outR')]));
  }
} finally { await renderer.close(); }
writeFileSync(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
