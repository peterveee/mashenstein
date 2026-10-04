// Auto Portamento, before and after: three short melodies, four sustained leads, and for
// each pair the same notes with the setting off, at its defaults, and turned up.
//
//   lyrical   an eighth-note tune that breathes — steps, a third or two, held landings
//   run       sixteenths up and down a scale into held notes — where articulation matters most
//   leap      short phrases with rests between them, a leap of a ninth and one of more than an
//             octave — where the policy has to leave things alone
//
// The sounds are catalogue presets the Lab and the desk really use. `syncRazorLead` is the
// Eurobeat hook (mono, with a glide of its own), `mrdrConcertFlute` the Shibuya hook,
// `bestRobotVox` the Electro hook, and `simpleSawtooth` a pooled Tone lead — so the claim
// "it works on both families" is something to listen to as well as something to measure.
//
// Every take of one melody on one sound is rendered at the same gain, so a before and an
// after differ in the slides and in nothing else. What was chosen, and why, is written beside
// the audio (manifest.json) so the choices can be heard against their reasons.
//
// Usage: node tools/render-portamento-auditions.js [melody ...]
// Writes work/auditions/auto-portamento/<melody>-<sound>-{before,after,max}.wav + manifest.json
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES } from '../src/data/voices.js';
import { createLaneView } from '../src/engine/lane-view.js';
import { autoPortamentoSettings, autoPortamentoSupport } from '../src/engine/auto-portamento.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'auto-portamento');
mkdirSync(outDir, { recursive: true });

const BPM = 104;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const E4 = 64; const Fs4 = 66; const Gs4 = 68; const A4 = 69; const B4 = 71; const Cs5 = 73;
const Ds5 = 75; const E5 = 76; const G4 = 67; const C5 = 72; const D5 = 74; const G5 = 79;

// [midi, length in steps] pairs, laid end to end from step 0; null is a rest.
const MELODIES = {
  lyrical: [
    [E4, 2], [Fs4, 2], [Gs4, 2], [A4, 2], [B4, 4], [Gs4, 4],
    [A4, 2], [Gs4, 2], [Fs4, 2], [E4, 2], [Fs4, 8],
    [Gs4, 2], [A4, 2], [B4, 2], [Cs5, 2], [Ds5, 4], [B4, 4],
    [Cs5, 2], [B4, 2], [A4, 2], [Gs4, 2], [E4, 8],
  ],
  run: [
    [E4, 1], [Fs4, 1], [Gs4, 1], [A4, 1], [B4, 1], [Cs5, 1], [Ds5, 1], [E5, 9],
    [Ds5, 1], [Cs5, 1], [B4, 1], [A4, 1], [Gs4, 1], [Fs4, 1], [E4, 1], [Gs4, 1], [B4, 8],
    [A4, 1], [B4, 1], [Cs5, 1], [Ds5, 1], [E5, 1], [Ds5, 1], [Cs5, 1], [B4, 1], [E5, 16],
  ],
  leap: [
    [G4, 2], [A4, 2], [B4, 6], [null, 6],
    [E4, 2], [Cs5, 6], [null, 6],                       // a ninth up, then held
    [E4, 2], [G5, 6], [null, 6],                        // more than an octave: left alone
    [C5, 2], [D5, 2], [E5, 2], [D5, 2], [C5, 2], [B4, 2], [A4, 8],
  ],
};

const SOUNDS = ['syncRazorLead', 'mrdrConcertFlute', 'bestRobotVox', 'simpleSawtooth'];

const sectionsOf = (list) => {
  const flat = []; let step = 0;
  for (const [midi, len] of list) {
    flat.push({ step, midi, len });
    step += len;
  }
  const total = Math.ceil(step / 32) * 32;
  const notes = new Array(total).fill(null); const lens = new Array(total).fill(null);
  for (const n of flat) if (n.midi != null) { notes[n.step] = hz(n.midi); lens[n.step] = n.len; }
  const sections = [];
  for (let s = 0; s < total; s += 32) {
    sections.push({ lead: notes.slice(s, s + 32), leadLen: lens.slice(s, s + 32) });
  }
  return { sections, steps: total };
};

const SETTINGS = {
  before: null,
  after: autoPortamentoSettings({}),
  max: autoPortamentoSettings({ amount: 100, glide: 60 }),
};

const only = new Set(process.argv.slice(2));
const names = Object.keys(MELODIES).filter((m) => !only.size || only.has(m));
if (!names.length) { console.error(`no melody matches ${[...only].join(', ')}`); process.exit(1); }

const renderer = await openRenderer();
const manifest = { bpm: BPM, settings: SETTINGS, takes: [] };
try {
  for (const name of names) {
    const { sections, steps } = sectionsOf(MELODIES[name]);
    for (const sound of SOUNDS) {
      const voice = VOICES[sound];
      const support = autoPortamentoSupport(voice);
      if (!support.supported) { console.log(`${name}/${sound}: not supported (${support.reason}) — skipped`); continue; }
      const bank = { bpm: BPM, leadVoice: sound, sections, order: sections.map((_, i) => i) };
      const takes = {};
      for (const [label, port] of Object.entries(SETTINGS)) {
        const mix = {
          voice: { leadVoice: sound },
          lanes: { lead: { gain: 0, send: { delay: 0, reverb: 0.12 }, ...(port ? { noteFx: { portamento: port } } : {}) } },
          fx: { reverb: { decay: 1.4, preDelay: 0.012 } },
        };
        takes[label] = await renderer.render(bank, { repeat: 1, tail: 2, mix, trackId: null });
      }
      // One gain for the three takes: the peak of the loudest, so none clips and none is re-levelled.
      const peak = Math.max(...Object.values(takes).map((t) => t.peak || 0.0001));
      const gain = 0.89 / peak;
      // What the planner chose, for the manifest — the same plan the scheduler reads.
      const view = createLaneView({ bank, mix: null, resolution: 16, formSteps: steps });
      const planned = {};
      for (const label of ['after', 'max']) {
        const p = view.plan('lead', SETTINGS[label], { secondsPerBeat: 60 / BPM });
        planned[label] = p.transitions.map((t) => ({
          from: t.sourceId, to: t.destinationId, reason: t.reason,
          semitones: Math.round(t.semitones * 10) / 10, glideMs: Math.round(t.glideSeconds * 1000),
        }));
      }
      for (const [label, out] of Object.entries(takes)) {
        const file = `${name}-${sound}-${label}.wav`;
        writeFileSync(join(outDir, file), wavBuffer([out.outL, out.outR], gain));
        console.log(`${file.padEnd(40)} peak ${dbfs(out.peak * gain).padStart(10)}`);
      }
      manifest.takes.push({
        melody: name, sound, family: voice.synth, mode: voice.mode || 'poly',
        glide: voice.portamento ?? 0, gain, slides: planned,
      });
    }
  }
} finally {
  await renderer.close();
}
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nwork/auditions/auto-portamento/ — ${manifest.takes.length} sets of three, manifest.json beside them`);
