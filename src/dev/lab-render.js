// LAB WAV RENDER — the dev menu's test of "can the Lab save a song as a WAV".
//
// Two songs, one cheap and one expensive, each rendered offline through the desk's own
// bounce (tools/mixer-bounce.js → a hidden iframe → tools/lib/render-bank-page.js), so
// what this measures is exactly what a Lab export would run. The frame is built per
// request by the dev server (/__dev/render-frame in build/build.js).
//
//   SIMPLE   a CHIPSTEP take on the Light sound set: no MRDR-3, no JMJR-4
//   COMPLEX  NEON ORBIT, the Lab's starter: MRDR-3 leads and bass, TNGR-2 pads
//
// Saving is a second tap, on purpose. iOS only opens the share sheet from a tap, and a
// render is far too long for the tap that started it to still count — so a real Lab
// export would be RENDER, then SAVE, and so is this. Both ways out are offered: a plain
// download (desktop; Files ▸ Downloads on an iPhone) and the share sheet (Save to Files,
// AirDrop, Messages) wherever the browser can share files.
import { bounceWav } from '../../tools/mixer-bounce.js';
import { makeBanger, defaultMoodFor, RECIPE_EXPRESSION } from '../game/banger/make.js';
import { DEFAULT_SIMPLE } from '../game/banger/riff.js';
import { STARTERS } from '../game/banger/starters.js';

const FRAME_URL = '/__dev/render-frame';

// A track id of its own, so the bounce counts bars and reads the loop markers off the
// song's arrangement — with no id it would size the render from the composed form.
const TRACK_ID = 'lab-render-test';

const SONGS = [
  {
    id: 'simple',
    label: 'SIMPLE - CHIPSTEP, LIGHT SET',
    file: 'mashenstein-lab-simple-chipstep.wav',
    // Seed 11 rolls the Light set rather than 8-Bit (labSoundSet).
    make: () => makeBanger({ notes: DEFAULT_SIMPLE, style: 'chipstep', mood: defaultMoodFor('chipstep'), seed: 11, expression: RECIPE_EXPRESSION }),
  },
  {
    id: 'complex',
    label: 'COMPLEX - NEON ORBIT (MRDR-3, TNGR-2)',
    file: 'mashenstein-lab-complex-neon-orbit.wav',
    make: () => STARTERS['neon-orbit'].song(),
  },
];

// Per song: { stage, fraction, made, result, error }. Lives for the page, so a render
// survives leaving the menu and coming back.
const runs = new Map();
let busy = false;

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const secs = (ms) => `${(ms / 1000).toFixed(1)}S`;
const mb = (n) => `${(n / 1e6).toFixed(1)}MB`;

async function render(dev, song) {
  if (busy) return;
  busy = true;
  const run = { stage: 'making', fraction: 0 };
  runs.set(song.id, run);
  dev.refresh();
  try {
    const t0 = performance.now();
    const s = song.make();
    run.made = performance.now() - t0;
    const t1 = performance.now();
    const out = await bounceWav(s.bank, {
      trackId: TRACK_ID, mix: s.mix, arrangement: s.arrangement ?? null, frameUrl: FRAME_URL,
      onStage: (stage, fraction = 0) => { run.stage = stage; run.fraction = fraction; dev.refresh(); },
    });
    run.result = { ...out, ms: performance.now() - t1 };
    console.log(`[lab-render] ${song.id}: ${out.seconds.toFixed(1)}s of song in ${(run.result.ms / 1000).toFixed(1)}s`
      + ` (${(out.seconds / (run.result.ms / 1000)).toFixed(2)}x realtime), made in ${run.made.toFixed(0)}ms,`
      + ` peak ${out.peakDb.toFixed(1)} dB, ${out.lufs.toFixed(1)} LUFS, ${mb(out.wav.length)} — ${navigator.userAgent}`);
    dev.say(`${song.id.toUpperCase()} RENDERED`);
  } catch (err) {
    run.error = String(err?.message || err);
    console.error('[lab-render]', song.id, err);
    dev.say(`${song.id.toUpperCase()} FAILED`);
  } finally {
    run.stage = null;
    busy = false;
    dev.refresh();
  }
}

const fileOf = (song) => new File([runs.get(song.id).result.wav], song.file, { type: 'audio/wav' });

function download(dev, song) {
  const url = URL.createObjectURL(fileOf(song));
  const a = document.createElement('a');
  a.href = url;
  a.download = song.file;
  a.click();
  // Long enough for a 20MB blob to be read on a phone.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  dev.say(`DOWNLOADED ${song.file}`);
}

const canShareFiles = () => {
  try {
    return !!navigator.canShare?.({ files: [new File([new Uint8Array(44)], 'x.wav', { type: 'audio/wav' })] });
  } catch { return false; }
};

function share(dev, song) {
  // Straight from the tap: anything awaited before this would spend the activation.
  navigator.share({ files: [fileOf(song)], title: song.file })
    .then(() => dev.say('SHARED'))
    .catch((err) => dev.say(err?.name === 'AbortError' ? 'SHARE CANCELLED' : `SHARE FAILED: ${err?.message || err}`));
}

function songRows(dev, song) {
  const run = runs.get(song.id);
  const rows = [{
    label: run?.stage ? `${song.label}  ...` : `RENDER ${song.label}`,
    act: busy ? null : () => { render(dev, song); },
  }];
  if (run?.stage) {
    rows.push({ label: `  ${run.stage.toUpperCase()} ${Math.round((run.fraction || 0) * 100)}%`, act: null });
  } else if (run?.error) {
    rows.push({ label: `  ERROR: ${run.error}`, act: null });
  } else if (run?.result) {
    const r = run.result;
    rows.push({ label: `  ${mmss(r.seconds)} OF SONG IN ${secs(r.ms)} = ${(r.seconds / (r.ms / 1000)).toFixed(1)}X REALTIME`, act: null });
    rows.push({ label: `  PEAK ${r.peakDb.toFixed(1)} DB, ${r.lufs.toFixed(1)} LUFS, ${mb(r.wav.length)}, MADE IN ${Math.round(run.made)}MS`, act: null });
    rows.push({ label: '  SAVE - DOWNLOAD', act: () => download(dev, song) });
    if (canShareFiles()) rows.push({ label: '  SAVE - SHARE SHEET', act: () => share(dev, song) });
  }
  return rows;
}

export function labRenderMenu(dev) {
  const build = () => ({
    title: 'LAB WAV RENDER',
    items: [
      ...songRows(dev, SONGS[0]),
      ...songRows(dev, SONGS[1]),
      { label: 'ONE AT A TIME. WAV, 16-BIT 44.1K, AT THE GAME LEVEL', act: null },
      { label: 'ON A PHONE USE NPM RUN DEVS - NO WORKLETS OVER HTTP', act: null },
    ],
  });
  return { ...build(), rebuild: build };
}
