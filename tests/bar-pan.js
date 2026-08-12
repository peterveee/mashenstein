// A BAR'S PAN IS THE CHANNEL'S PAN, PLUS THE BAR'S OFFSET.
//
// The desk can move one lane left or right for a range of bars — `panBars` writes a
// number in the pan pot's own units onto the plan, and `scheduleStep` answers it by
// handing that offset to the lane's channel strip. The offset is not a position: a lane
// sitting at +10 in the mix, with a bar asking for -20, plays that bar at -10.
//
// That arithmetic is the whole reason this cannot work the way the per-bar GAIN trim
// does. A gain trim gets a node of its own in front of the strip, so a bar's level is a
// multiply that only touches the notes routed through it. Pan does not compose: a
// StereoPanner at hard right followed by one at hard left leaves the signal hard LEFT,
// not centred, so an offset only means what it says if ONE panner ends up holding the
// sum — the channel's. What that costs is what pan automation costs in any DAW, and it
// is the second claim below.
//
// Three claims, all measured off the rendered samples rather than asserted about the
// graph. Each is the same song rendered twice: once with the bar edit, once with the
// answer dialled into the channel's own pan and no bar edit at all. If the two renders
// agree channel for channel, the bar edit means exactly what the pot means.
//
//   1. A BAR WITHOUT AN EDIT IS WHERE THE MIX PUT IT. Bar 1 of the edited song matches
//      the same song panned +10 and left alone — the offset does not leak backwards out
//      of the bar that carries it.
//   2. THE OFFSET IS ADDED, NOT SUBSTITUTED. Bar 2, at +10 with a -60 bar, matches the
//      same song panned -50. This is the claim the whole feature is.
//   3. THE MIX IS NOT REWRITTEN. The strip's own pan still reads +10 afterwards, and
//      stopping the song takes the offset off the channel — a strip left where the last
//      bar of the last song put it is a pot that lies about what you are hearing.
//
// Chromium and OfflineAudioContext, like tests/bar-gain.js, for the same reason: the
// claim is about what Web Audio actually rendered.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

// 120 BPM: a sixteenth is 0.125s and a bar is 2s. Both bars play the same four notes,
// so the only difference between them is where they sit in the room.
const BPM = 120;
const MIX_PAN = 0.1;          // where the channel is panned, as the pot holds it: +10
const BAR_OFFSET = -60;       // what the bar asks for, in the pot's own units
const WANT_PAN = MIX_PAN + BAR_OFFSET / 100;   // -0.5, the sum the strip should hold
const SECONDS = 5;

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;

  const browser = await chromium.launch({ headless: true });
  const errors = [];

  // A fresh page per render: Audio is a singleton and `ensure` binds one context for
  // its lifetime, exactly as tools/lib/render-bank-browser.js explains.
  //
  // `barEdit` is the offset the second bar carries, or null for a reference render;
  // `mixPan` is where the channel sits in both cases.
  async function render({ barEdit, mixPan }) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${e.message}`));
    await page.setContent(
      `<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
      { waitUntil: 'load' },
    );
    const out = await page.evaluate(async (cfg) => {
      const Audio = window.__Audio;
      const SR = 44100;
      const rest = () => new Array(32).fill(null);
      const notes = rest();
      const lens = rest();
      [0, 4, 8, 12].forEach((s, i) => { notes[s] = 440 * (2 ** (i / 12)); lens[s] = 3; });
      // Two one-bar entries of the SAME half of the same section, so bar 2 plays note
      // for note what bar 1 plays and nothing but the pan can differ between them.
      const bar2 = { s: 0, bars: 1 };
      if (cfg.barEdit != null) bar2.pan = { twinkle: cfg.barEdit };
      const bank = {
        bpm: cfg.bpm,
        twinkle: notes,
        twinkleLen: lens,
        twinkleVoice: 'celeste2',
        twinkleGain: 0.25,
        order: [{ s: 0, bars: 1 }, bar2],
      };
      // The channel's own pan, through the ordinary mix path — the pot, exactly as a
      // saved mix sets it.
      const mix = { lanes: { twinkle: { gain: 0, pan: cfg.mixPan, mute: false } } };

      const ctx = new OfflineAudioContext(2, SR * cfg.seconds, SR);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;

      Audio.setBank(bank, mix);
      // From sample zero at full trim, like every other offline render here: the gap
      // setBank opens is for live playback, and this render starts from silence.
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      const spb = (60 / cfg.bpm) / 4;
      // Both bars scheduled before a sample is rendered, which is what an offline bounce
      // does — and, for pan, the case where every automation point is already on the
      // param before the first quantum runs.
      for (let i = 0; i < 32; i++) Audio.scheduleStep();

      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      // Where the sound sits, as one number: the right channel's share of the pair.
      // 0.5 is centre, 0 is hard left, 1 is hard right. A ratio rather than a level, so
      // it says nothing about how loud the bar is and everything about where it is.
      const balance = (from, to) => {
        const a = Math.max(0, Math.floor(from * SR));
        const b = Math.min(L.length, Math.floor(to * SR));
        let l = 0; let r = 0;
        for (let i = a; i < b; i++) { l += L[i] * L[i]; r += R[i] * R[i]; }
        const rl = Math.sqrt(l / Math.max(1, b - a));
        const rr = Math.sqrt(r / Math.max(1, b - a));
        return { balance: rl + rr > 0 ? rr / (rl + rr) : 0.5, level: Math.sqrt(rl * rl + rr * rr) };
      };
      // A bar each, starting 60ms in so the twelve-millisecond ramp at the bar line is
      // behind us: what is measured is where the bar SITS, not how it got there.
      const bars = [0, 1].map((i) => balance(i * 16 * spb + 0.06, (i + 1) * 16 * spb));
      const floor = balance(cfg.seconds - 0.5, cfg.seconds).level;
      // The pot is the MIX's, and a bar must not have written it. Read after the render
      // rather than before, so this is the value the offset was riding on all along.
      const potPan = Audio.mixer.lane('twinkle').state.pan;
      // Stopping the song takes the offset back off the channel.
      Audio.setBank(null, null);
      const offsetAfterStop = Audio.mixer.lane('twinkle').panOffset;
      return { bars, floor, potPan, offsetAfterStop };
    }, { bpm: BPM, barEdit, mixPan, seconds: SECONDS });
    await page.close();
    return out;
  }

  const edited = await render({ barEdit: BAR_OFFSET, mixPan: MIX_PAN });
  const asMixed = await render({ barEdit: null, mixPan: MIX_PAN });
  const asSummed = await render({ barEdit: null, mixPan: WANT_PAN });

  assert(!errors.length, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);

  // Both bars still sound. A pan that silenced the bar would pass every ratio below.
  edited.bars.forEach((bar, i) => {
    assert(bar.level > Math.max(edited.floor * 20, 1e-4),
      `bar ${i + 1} of the edited song is audible `
      + `(rms ${bar.level.toExponential(2)}, floor ${edited.floor.toExponential(2)})`);
  });

  // 1. The bar without an edit is where the mix put it.
  assert(Math.abs(edited.bars[0].balance - asMixed.bars[0].balance) < 0.01,
    `bar 1 sits where the mix pans it, +${MIX_PAN * 100} `
    + `(balance ${edited.bars[0].balance.toFixed(4)} vs ${asMixed.bars[0].balance.toFixed(4)})`);

  // 2. The offset is added to the channel's pan, not substituted for it.
  assert(Math.abs(edited.bars[1].balance - asSummed.bars[1].balance) < 0.01,
    `bar 2 at +${MIX_PAN * 100} offset by ${BAR_OFFSET} plays where ${WANT_PAN * 100} plays `
    + `(balance ${edited.bars[1].balance.toFixed(4)} vs ${asSummed.bars[1].balance.toFixed(4)})`);
  // And it is not the same as substituting it, which is the way this could pass claim 2
  // by accident if the two happened to be close: -50 and +10 are far apart, so say so.
  assert(edited.bars[1].balance < edited.bars[0].balance - 0.05,
    `bar 2 is audibly to the LEFT of bar 1 `
    + `(${edited.bars[1].balance.toFixed(4)} against ${edited.bars[0].balance.toFixed(4)})`);

  // 3. The mix is not rewritten, and the offset does not outlive the song.
  assert(Math.abs(edited.potPan - MIX_PAN) < 1e-9,
    `the channel's own pan still reads +${MIX_PAN * 100} (${edited.potPan})`);
  assert(edited.offsetAfterStop === 0,
    'stopping the song takes the bar offset back off the channel');

  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
