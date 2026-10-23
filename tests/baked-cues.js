// THE HEAVY CUES, BAKED (Audio._bakedCue; 22 Oct 2026).
//
// The thunder — fifty-odd nodes for six seconds every strike, and on the iPad a crackle at each
// of Neon's lightning strikes — is rendered once offline and played from a buffer after that.
// Live in headless WebKit, silently: the first firing is built live as it always was; a later
// one is the buffer, a handful of nodes; and the two sound alike — the same loudness and the same
// shape over time, to within what a live render's noise allows.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.run = async (name) => {
  const conn = AudioNode.prototype.connect; let tap = null; const rms = [];
  AudioNode.prototype.connect = function (d, ...r) {
    // Only the live context's speakers: the bake renders into an offline context of its own.
    if (d instanceof AudioDestinationNode && !(d.context instanceof OfflineAudioContext)) {
      if (!tap) { const ctx = d.context; tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 2048; const z = ctx.createGain(); z.gain.value = 0;
        conn.call(tap, an); conn.call(an, z); conn.call(z, d); const buf = new Float32Array(2048);
        setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; rms.push([ctx.currentTime, Math.sqrt(s / buf.length)]); }, 40); }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  let made = 0;
  const BP = BaseAudioContext.prototype;
  for (const m of Object.getOwnPropertyNames(BP)) if (m.startsWith('create') && typeof BP[m] === 'function' && m !== 'createBuffer' && m !== 'createPeriodicWave') {
    const f = BP[m]; BP[m] = function (...a) { if (this === Audio.ctx) made++; return f.apply(this, a); };
  }
  Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.ensure(); await Audio.ctx.resume();
  const fire = async () => {
    const before = made; const t0 = Audio.ctx.currentTime;
    Audio.sfx(name);
    const nodes = made - before;
    await new Promise((r) => setTimeout(r, 7000));
    const env = []; for (let k = 0; k < 14; k++) { const w = rms.filter(([t]) => t >= t0 + k * 0.5 && t < t0 + (k + 1) * 0.5).map(([, v]) => v); env.push(w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0); }
    return { nodes, env };
  };
  const live = await fire();
  const baked = await fire();
  return { live, baked };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  for (const name of ['thunder', 'boom']) {
    const page = await browser.newPage();
    await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.live/');
    const { live, baked } = await page.evaluate((n) => window.run(n), name);
    await page.close();
    assert(live.nodes > 15 && baked.nodes <= 4, `${name}: built live the first time (${live.nodes} nodes), a buffer after (${baked.nodes})`);
    const db = (v) => 20 * Math.log10(Math.max(v, 1e-6));
    const loudest = (e) => Math.max(...e);
    assert(Math.abs(db(loudest(baked.env)) - db(loudest(live.env))) < 1.5, `${name}: as loud (${db(loudest(live.env)).toFixed(1)} vs ${db(loudest(baked.env)).toFixed(1)} dB RMS at its loudest)`);
    const shape = live.env.map((v, i) => (live.env[i] > loudest(live.env) / 30 ? Math.abs(db(baked.env[i]) - db(v)) : 0));
    assert(Math.max(...shape) < 3, `${name}: the same shape over time (worst half-second ${Math.max(...shape).toFixed(1)} dB apart)`);
  }
} finally {
  await browser.close();
}
console.log(failed ? 'BAKED CUES: FAILED' : 'BAKED CUES: PASSED');
if (failed) process.exitCode = 1;
