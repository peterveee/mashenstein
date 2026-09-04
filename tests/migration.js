// Save migration: a v1-era blob imports coins/hiScore/muted; corrupt data
// falls back to fresh defaults without throwing.
import { installDom } from './dom-stub.js';
const dom = installDom();

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// Case 1: v1 blob present.
dom.store['superMashBros.v1'] = JSON.stringify({ coins: 1234, hiScore: 9876, muted: true });
{
  const { Save } = await import('../src/engine/save.js');
  const s = new Save().load();
  assert(s.data.version === 2, 'migrated to v2');
  assert(s.data.slots[0] && s.data.slots[0].coins === 1234, 'v1 coins imported into slot 1');
  assert(s.data.slots[0].overtime.best === 9876, 'v1 high score imported');
  assert(s.data.settings.muted === true, 'v1 mute imported');
}

// Case 2: corrupt v2 data.
dom.store['mashenstein.v2'] = '{definitely not json';
{
  const { Save } = await import('../src/engine/save.js?x=2').catch(() => import('../src/engine/save.js'));
  const s = new Save().load();
  assert(s.data.version === 2, 'corrupt save falls back to defaults');
}

// Case 3: old v2 save missing new fields gets deep-defaulted.
const { defaultSlot, Save } = await import('../src/engine/save.js');
const partial = { version: 2, settings: {}, slots: [{ coins: 7 }, null, null] };
dom.store['mashenstein.v2'] = JSON.stringify(partial);
{
  const s = new Save().load();
  assert(s.data.slots[0].coins === 7, 'existing field preserved');
  assert(s.data.slots[0].bench && s.data.slots[0].bench.shield === 1, 'missing fields deep-defaulted');
  assert(s.data.settings.assistSpeed === 100, 'missing settings defaulted');
  assert(s.data.settings.showFps === false, 'FPS display defaults off for existing saves');
  assert(s.data.settings.renderDensityByBackend.webgl === 0
    && s.data.settings.renderDensityByBackend['2d'] === 0,
  'backend-specific render densities default to auto for existing saves');
  assert(s.data.settings.renderDensityVersion === 2,
    'render-density history is stamped with the current migration version');
  assert(s.data.settings.audioSyncMs === 0 && s.data.settings.audioSyncAsked === false
    && s.data.settings.audioSyncReportedMs === null,
  'audio sync starts uncalibrated and unasked, so the rhythm briefing still offers it');
}

// Case 3b: the audio offset is clamped and stepped on the way in. Every read of
// it happens inside a beat calculation, where a NaN stops the rhythm lane dead.
{
  const { clampAudioSyncMs } = await import('../src/engine/save.js');
  assert(clampAudioSyncMs(900) === 500 && clampAudioSyncMs(-250) === -100,
    'an out-of-range offset is clamped rather than trusted');
  assert(clampAudioSyncMs(123) === 120, 'and rounded to the step the settings row moves by');
  assert(clampAudioSyncMs('abc') === 0 && clampAudioSyncMs(undefined) === 0,
    'a nonsense offset reads as none');
  dom.store['mashenstein.v2'] = JSON.stringify({
    version: 2, settings: { audioSyncMs: 9000, audioSyncReportedMs: 'x' }, slots: [null, null, null],
  });
  const s = new Save().load();
  assert(s.data.settings.audioSyncMs === 500 && s.data.settings.audioSyncReportedMs === null,
    'a hand-edited save cannot put a bad number on the audio clock');
}

// Case 4: the old scalar density is deliberately discarded because it does not
// identify the renderer that produced it.
dom.store['mashenstein.v2'] = JSON.stringify({
  version: 2,
  settings: { renderDensity: 1.5 },
  slots: [null, null, null],
});
{
  const s = new Save().load();
  assert(!('renderDensity' in s.data.settings), 'ambiguous legacy render density is removed');
  assert(s.data.settings.renderDensityByBackend.webgl === 0
    && s.data.settings.renderDensityByBackend['2d'] === 0,
  'a low legacy WebGL result cannot soften the 2D renderer');
}

// Case 5: old 2D history is invalidated after the direct-rendering change,
// while a separately learned WebGL value remains useful.
dom.store['mashenstein.v2'] = JSON.stringify({
  version: 2,
  settings: { renderDensityByBackend: { webgl: 2, '2d': 2.5 } },
  slots: [null, null, null],
});
{
  const s = new Save().load();
  assert(s.data.settings.renderDensityByBackend.webgl === 2
    && s.data.settings.renderDensityByBackend['2d'] === 0,
  'the renderer migration clears stale 2D history but preserves WebGL history');
}

console.log(failed ? 'MIGRATION: FAILED' : 'MIGRATION: PASSED');
process.exit(failed ? 1 : 0);
