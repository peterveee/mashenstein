// GROUP BUSES — MEASURED OFF THE SAMPLES.
//
// A channel routed into a group feeds the group instead of the mix; the group sums its
// members through its own EQ, inserts, Spot FX, fader and pan into the same music bus.
// The format is src/data/group-buses.js; the engine is the group-bus half of createMixer
// in src/engine/mixer.js and applyMix in src/engine/audio.js. Rendered in Chromium through
// an OfflineAudioContext, like tests/fx-sections.js, because what goes wrong with routing
// is a doubled path, a missing one or a fade where there should be none, and none of
// those shows anywhere but in the audio:
//
//   1. NO MEMBERS, NO GROUPS. A mix with a `groups` block and nobody routed into it is
//      the same samples as one without, and builds no group at all.
//   2. A GROUP AT ITS DEFAULTS IS A WIRE: every track routed through it renders as it did
//      unrouted, from the first sample (no fade-in at bar one).
//   3. EXACTLY ONCE: a member reaches the mix through its group and nowhere else.
//   4. THE GROUP FADER moves its members together and keeps their balance.
//   5. ONE PROCESSOR for the whole group, on the sum.
//   6. MUTE is a broadcast: the members and their sends go silent; a lane muted by hand
//      stays muted; the lane's own saved mute is never written.
//   7. SOLO: a soloed group is its members, as soloed channels; a member soloed alone is
//      ordinary channel solo.
//   8. SPOT FX ON A GROUP act on the group and nothing else: the unrouted bass is the same
//      samples with or without them. A SWEEP section glides across it.
//   9. NO PHANTOM STRIP is built for a group's arrangement key.
//  10. A LIVE REASSIGNMENT cross-fades: the track is the same before it, grouped after it.
//  11. A DELETED TRACK is not a member and holds no group open.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
window.__Tone = Tone;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// 120 BPM: a sixteenth is 0.125s and a bar is 2s.
const SPB = 0.125;
const SR = 44100;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const errors = [];

async function freshPage(label) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  return page;
}

/**
 * One song render, a channel back as a plain array, and what the engine built: which
 * group buses exist, whether a strip was made for a group key, a group's chain length.
 * `live` runs at `liveAt` seconds, mid-render — a live reassignment.
 */
async function render(label, { bank, mix = null, arrangement, steps = 32, seconds = 4.5, channel = 0, live = null, liveAt = 1 }) {
  const page = await freshPage(label);
  const out = await page.evaluate(async (c) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * c.seconds, 44100);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(c.bank, c.mix, c.arrangement ?? undefined);
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    for (let i = 0; i < c.steps; i++) Audio.scheduleStep();
    const m = Audio.mixer;
    if (c.live === 'fade-in-group') {
      // The track starts on the mix; the group is already turned down 12 dB, and at
      // `liveAt` the track is moved into it the way the desk does while playing.
      m.setGroup('group1', { gain: -12 });
      ctx.suspend(c.liveAt).then(() => {
        m.setLaneRoute('lead', 'group1', { seconds: 0.02, when: c.liveAt });
        ctx.resume();
      });
    }
    // the Lab club's mute: the live gate shut from the start (setLiveLevel)
    if (c.live === 'live-level-zero') m.lane('lead').setLiveLevel(0, 0, 0);
    const probe = {
      buses: ['group1', 'group2', 'group3', 'group4'].map((id) => !!m._groupBus(id)),
      phantom: ['__group:group1', '__group:group9'].some((k) => !!m.lane(k)),
      chain: m._groupBus('group1')?.slot.chain.length ?? null,
      leadRoute: m.laneRoute('lead'),
    };
    const buf = await ctx.startRendering();
    return { probe, x: Array.from(buf.getChannelData(c.channel)) };
  }, { bank, mix, arrangement, steps, seconds, channel, live, liveAt });
  await page.close();
  return out;
}

const rms = (x, from, to) => {
  const a = Math.max(0, Math.floor(from * SR));
  const b = Math.min(x.length, Math.floor(to * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return b > a ? Math.sqrt(s / (b - a)) : 0;
};
const maxDiff = (a, b, from = 0, to = Infinity) => {
  let m = 0;
  for (let i = Math.floor(from * SR); i < Math.min(a.length, Math.floor(to * SR)); i++) {
    m = Math.max(m, Math.abs(a[i] - b[i]));
  }
  return m;
};
const peak = (x, from = 0, to = Infinity) => {
  let m = 0;
  for (let i = Math.floor(from * SR); i < Math.min(x.length, Math.floor(to * SR)); i++) m = Math.max(m, Math.abs(x[i]));
  return m;
};

const rest = () => new Array(32).fill(null);
// Two lanes, each a note held through the bar and struck again at the next, so every
// sixteenth has a steady level to compare.
const held = (hz) => {
  const notes = rest(); const lens = rest();
  for (const s of [0, 16]) { notes[s] = hz; lens[s] = 16; }
  return [notes, lens];
};
const [leadN, leadL] = held(440);
const [bassN, bassL] = held(110);
const both = { bpm: 120, lead: leadN, leadLen: leadL, bass: bassN, bassLen: bassL, order: [{ s: 0, bars: 2 }] };
const leadOnly = { bpm: 120, lead: leadN, leadLen: leadL, order: [{ s: 0, bars: 2 }] };
// The lead lane present but silent, the bass playing — what "leave the bass alone" means.
const bassOnly = { bpm: 120, lead: rest(), leadLen: rest(), bass: bassN, bassLen: bassL, order: [{ s: 0, bars: 2 }] };

try {
  // ---- 1. no members, no groups -------------------------------------------------------
  const plain = await render('plain', { bank: both });
  {
    const unused = await render('unused', { bank: both, mix: {
      groups: { group1: { gain: -6, effects: [{ id: 'distortion', params: { distortion: 0.8, wet: 1 } }] } },
    } });
    assert(maxDiff(plain.x, unused.x) === 0,
      `a mix carrying group settings with nobody routed into them is the same samples (max diff ${maxDiff(plain.x, unused.x)})`);
    assert(unused.probe.buses.every((b) => !b), 'and builds no group bus at all');
  }

  // ---- 2. a group at its defaults is a wire; 11. from the first sample ------------------
  {
    const grouped = await render('grouped', { bank: both, mix: { lanes: { lead: { group: 'group1' }, bass: { group: 'group1' } } } });
    const d = maxDiff(plain.x, grouped.x);
    assert(d < 1e-6, `every track through a group at its defaults renders as it did unrouted (max diff ${d.toExponential(2)})`);
    assert(maxDiff(plain.x, grouped.x, 0, 0.05) < 1e-6 && rms(grouped.x, 0, 0.02) > 0.5 * rms(plain.x, 0, 0.02),
      'and from the very first sample: no fade-in at bar one');
    assert(grouped.probe.buses[0] && !grouped.probe.buses[1] && grouped.probe.leadRoute === 'group1',
      'only the group with members is built');
  }

  // ---- 3. exactly once ----------------------------------------------------------------
  {
    const lead = await render('lead', { bank: leadOnly });
    const down = await render('lead:-6', { bank: leadOnly, mix: {
      lanes: { lead: { group: 'group1' } }, groups: { group1: { gain: -6 } },
    } });
    const r = dB(rms(down.x, 0.2, 3.8) / rms(lead.x, 0.2, 3.8));
    assert(Math.abs(r + 6) < 0.01, `a member reaches the mix once, through its group: group at -6 dB reads ${r.toFixed(3)} dB, not doubled`);
  }

  // ---- 4. the group fader keeps the balance ---------------------------------------------
  {
    const g = 10 ** (-10 / 20);
    const down = await render('both:-10', { bank: both, mix: {
      lanes: { lead: { group: 'group1' }, bass: { group: 'group1' } }, groups: { group1: { gain: -10 } },
    } });
    let worst = 0;
    for (let i = 0; i < plain.x.length; i++) worst = Math.max(worst, Math.abs(down.x[i] - plain.x[i] * g));
    assert(worst < 1e-6, `the group fader scales its members together, balance kept (worst ${worst.toExponential(2)})`);
  }

  // ---- 5. one processor, on the sum ----------------------------------------------------------
  {
    const mix = { lanes: { lead: { group: 'group1' }, bass: { group: 'group1' } },
      groups: { group1: { effects: [{ id: 'distortion', params: { distortion: 0.9, wet: 1 } }] } } };
    const crushed = await render('crushed', { bank: both, mix });
    const leadAlone = await render('crushed:lead', { bank: leadOnly, mix });
    const bassAlone = await render('crushed:bass', { bank: bassOnly, mix });
    let apart = 0;
    for (let i = 0; i < crushed.x.length; i++) apart = Math.max(apart, Math.abs(crushed.x[i] - leadAlone.x[i] - bassAlone.x[i]));
    assert(crushed.probe.chain === 1, 'two members, one distortion in the group\'s chain');
    assert(apart > 1e-2 && maxDiff(crushed.x, plain.x) > 1e-2,
      `and it distorts the SUM — not the same as each member distorted on its own (${apart.toFixed(3)} apart)`);
  }

  // ---- 6. mute is a broadcast -------------------------------------------------------------------
  {
    const mix = { lanes: { lead: { group: 'group1', send: { reverb: 0.8 } } }, groups: { group1: { mute: true } } };
    const muted = await render('muted', { bank: leadOnly, mix });
    assert(peak(muted.x) < 1e-6, `a muted group silences its members and their reverb send (peak ${peak(muted.x).toExponential(1)})`);
    const page = await freshPage('mute-state');
    const st = await page.evaluate(async () => {
      const Audio = window.__Audio;
      const ctx = new OfflineAudioContext(2, 44100, 44100);
      Audio.ensure(ctx);
      await Audio.mixer.ready;
      const bank = { bpm: 120, lead: new Array(16).fill(null), bass: new Array(16).fill(null), order: [{ s: 0, bars: 1 }] };
      Audio.setBank(bank, { lanes: { lead: { group: 'group1' }, bass: { group: 'group1', mute: true } } });
      const m = Audio.mixer;
      const lead = m.lane('lead'); const bass = m.lane('bass');
      m.setGroup('group1', { mute: true });
      const during = { lead: lead._pres.gain.value, silent: m.laneSilent('lead'), saved: lead.state.mute };
      m.setGroup('group1', { mute: false });
      return { during, after: { lead: lead._pres.gain.value, bass: bass._pres.gain.value, bassSaved: bass.state.mute } };
    });
    await page.close();
    assert(st.during.lead === 0 && st.during.silent && st.during.saved === false,
      'group mute zeroes a member\'s fader and the scheduler skips it, without writing the lane\'s own mute');
    assert(st.after.lead === 1 && st.after.bass === 0 && st.after.bassSaved === true,
      'unmuting the group brings back only the members not muted by hand');
  }

  // ---- 6b. a live level takes the sends with it ----------------------------------------------------
  {
    const mix = { lanes: { lead: { send: { reverb: 0.8, delay: 0.8 } } } };
    const open = await render('live:open', { bank: leadOnly, mix });
    const shut = await render('live:shut', { bank: leadOnly, mix, live: 'live-level-zero' });
    assert(peak(open.x) > 0.01 && peak(shut.x) < 1e-6,
      `a lane's live level at 0 silences it and its reverb and delay sends (open ${peak(open.x).toFixed(3)}, shut ${peak(shut.x).toExponential(1)})`);
  }

  // ---- 7. solo ------------------------------------------------------------------------------------
  {
    const page = await freshPage('solo');
    const st = await page.evaluate(async () => {
      const Audio = window.__Audio;
      const ctx = new OfflineAudioContext(2, 44100, 44100);
      Audio.ensure(ctx);
      await Audio.mixer.ready;
      const bank = { bpm: 120, lead: new Array(16).fill(null), bass: new Array(16).fill(null),
        kick: new Array(16).fill(null), order: [{ s: 0, bars: 1 }] };
      Audio.setBank(bank, { lanes: { lead: { group: 'group1' }, kick: { group: 'group1' } } });
      const m = Audio.mixer;
      const gate = (k) => m.lane(k)._vol.gain.value;
      m.setGroupSolo('group1', true);
      const group = { lead: gate('lead'), kick: gate('kick'), bass: gate('bass') };
      m.setGroupSolo('group1', false);
      m.lane('lead').setSolo(true);
      const member = { lead: gate('lead'), kick: gate('kick'), bass: gate('bass') };
      m.clearSolo();
      const cleared = gate('bass');
      // the LIVE level (the Lab club's fader / mute / solo) rides the same gate, times solo
      m.lane('bass').setLiveLevel(0.25);
      m.clearSolo();
      const live = gate('bass');
      m.lane('lead').setSolo(true);
      const liveSoloed = gate('bass');
      m.clearSolo();
      return { group, member, cleared, live, liveSoloed, liveBack: gate('bass') };
    });
    await page.close();
    assert(st.group.lead === 1 && st.group.kick === 1 && st.group.bass === 0,
      'soloing a group hears exactly its members');
    assert(st.member.lead === 1 && st.member.kick === 0 && st.member.bass === 0,
      'soloing one member is ordinary channel solo — the rest of its group goes quiet too');
    assert(st.cleared === 1, 'and clearing solo opens everything again');
    assert(st.live === 0.25 && st.liveSoloed === 0 && st.liveBack === 0.25,
      `a live level is on the gate, upstream of the sends, multiplied with solo and kept through it (${st.live}, ${st.liveSoloed}, ${st.liveBack})`);
  }

  // ---- 8. Spot FX on a group --------------------------------------------------------------
  {
    const grouped = { lanes: { lead: { group: 'group1' } } };
    const section = (chain, from = [1, 8], to = [2, 0]) => ({ automation: { '__group:group1': { fx: [{ from, to, chain }] } } });
    const gain12 = [{ id: 'gain', params: { gain: -12 } }];
    const a = await render('fx:bass:none', { bank: bassOnly, mix: grouped });
    const b = await render('fx:bass:section', { bank: bassOnly, mix: grouped, arrangement: section(gain12) });
    assert(maxDiff(a.x, b.x) === 0, `a section on the group leaves the unrouted bass the same samples (max diff ${maxDiff(a.x, b.x)})`);
    const c = await render('fx:lead:none', { bank: leadOnly, mix: grouped });
    const d = await render('fx:lead:section', { bank: leadOnly, mix: grouped, arrangement: section(gain12) });
    const inside = [9, 11, 13, 15].map((i) => dB(rms(d.x, (i + 0.2) * SPB, (i + 0.8) * SPB) / rms(c.x, (i + 0.2) * SPB, (i + 0.8) * SPB)));
    assert(inside.every((v) => Math.abs(v + 12) < 0.05),
      `and takes the group's members down through its stretch (${inside.map((v) => v.toFixed(2)).join(', ')} dB)`);
    assert(maxDiff(c.x, d.x, 0, 8 * SPB - 0.001) < 1e-6 && maxDiff(c.x, d.x, 16 * SPB + 0.01, 4) < 1e-6,
      'and nowhere else');
    assert(!d.probe.phantom, 'no strip is built for a group\'s arrangement key');
    // A SWEEP: the group faded 0 → -24 dB across bar one.
    const e = await render('fx:lead:sweep', { bank: leadOnly, mix: grouped, arrangement: section(
      [{ id: 'gain', params: { gain: 0, sweep: 1, gainTo: -24 } }], [1, 0], [2, 0]) });
    const at = (t) => dB(rms(e.x, t - 0.05, t + 0.05) / rms(c.x, t - 0.05, t + 0.05));
    const fade = [0.5, 1.0, 1.5].map(at);
    assert(fade.every((v, i) => Math.abs(v - -24 * [0.25, 0.5, 0.75][i]) < 0.5),
      `a SWEEP section fades the group across its stretch (${fade.map((v) => v.toFixed(1)).join(', ')} dB at 25/50/75%)`);
    // A group key that is not one of the four: ignored, and no strip either.
    const f = await render('fx:bad-key', { bank: leadOnly, mix: grouped, arrangement: { automation: {
      '__group:group9': { fx: [{ from: [1, 0], to: [2, 0], chain: gain12 }] },
    } } });
    assert(!f.probe.phantom && maxDiff(f.x, c.x) === 0, 'a section on a group that does not exist does nothing and builds nothing');
  }

  // ---- 10. a live reassignment cross-fades ------------------------------------------------
  {
    const lead = await render('lead2', { bank: leadOnly });
    const moved = await render('live', { bank: leadOnly, live: 'fade-in-group', liveAt: 1 });
    const before = maxDiff(lead.x, moved.x, 0, 0.995);
    const after = dB(rms(moved.x, 1.1, 1.9) / rms(lead.x, 1.1, 1.9));
    let step = 0;
    for (let i = Math.floor(0.99 * SR); i < Math.floor(1.04 * SR); i++) {
      step = Math.max(step, Math.abs(moved.x[i] - moved.x[i - 1]));
    }
    let slope = 0;
    for (let i = Math.floor(0.9 * SR); i < Math.floor(0.98 * SR); i++) slope = Math.max(slope, Math.abs(lead.x[i] - lead.x[i - 1]));
    assert(before < 1e-6 && Math.abs(after + 12) < 0.05,
      `a track moved into a group while playing is unchanged before (${before.toExponential(1)}) and grouped after (${after.toFixed(2)} dB)`);
    assert(step <= slope * 1.05, `with no step at the handover (largest sample step ${step.toFixed(4)} against the music's own ${slope.toFixed(4)})`);
  }

  // ---- 11. a deleted track is not a member ------------------------------------------------
  {
    const gone = await render('off', { bank: both, mix: { off: ['bass'], lanes: { bass: { group: 'group1' } } } });
    assert(gone.probe.buses.every((b) => !b), 'a deleted track routed into a group holds no group open');
  }
} finally {
  await browser.close();
}

assert(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
if (failed) { console.error('GROUP BUSES: FAILED'); process.exit(1); }
console.log('GROUP BUSES: PASSED');
