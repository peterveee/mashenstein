// The mixing desk's output file: what it is allowed to contain, and that the desk
// can write everything it can hold.
//
// The serialiser is the risk here, not the data. It emits `src/data/mix.js` as
// readable source rather than JSON, field by field — so a field nobody thought to
// emit is silently dropped on save. That is exactly how effect chains were lost:
// they could be built, they sounded right, and Save to game quietly wrote a file
// without them. This round-trips a mix that uses every corner.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MIX, LANE_DEFAULTS, laneSettings } from '../src/data/mix.js';
import { renderMixFile } from '../tools/mixer.js';
import { AUXES, AUX_DEFAULTS } from '../src/engine/mixer.js';
import { EFFECT_BY_ID, MAX_EFFECTS, DEFAULT_MASTER_CHAIN } from '../src/engine/effects.js';
import { LANE_KEYS } from '../src/engine/lanes.js';
// The node-side registry, which is the one the desk saves against: a mix can be
// dialled in on an imported song, and an entry for it is not a broken mix file.
import { listTracks } from '../tools/lib/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- what is on disk -------------------------------------------------------
const trackIds = new Set(listTracks().map((t) => t.id));
const laneKeys = new Set(LANE_KEYS);
const auxIds = new Set(AUXES.map((a) => a.id));

assert(Object.keys(MIX).every((id) => trackIds.has(id)),
  'every mix entry names a track that exists');

for (const [id, entry] of Object.entries(MIX)) {
  for (const [key, lane] of Object.entries(entry.lanes || {})) {
    assert(laneKeys.has(key), `${id}: lane "${key}" is a real lane`);
    const s = laneSettings(lane);
    assert(s.gain >= -60 && s.gain <= 6, `${id}.${key}: gain ${s.gain} is inside the fader's range`);
    assert(s.pan >= -1 && s.pan <= 1, `${id}.${key}: pan is inside -1..1`);
    for (const [aux, v] of Object.entries(lane.send || {})) {
      assert(auxIds.has(aux), `${id}.${key}: send "${aux}" is a real aux`);
      assert(v >= 0 && v <= 2, `${id}.${key}: ${aux} send is inside 0..2`);
    }
    const chain = lane.effects || [];
    assert(chain.length <= MAX_EFFECTS, `${id}.${key}: at most ${MAX_EFFECTS} effects`);
    assert(chain.every((e) => EFFECT_BY_ID[e.id]),
      `${id}.${key}: every effect id is in the catalogue`);
  }
  for (const [aux, patch] of Object.entries(entry.fx || {})) {
    assert(auxIds.has(aux), `${id}: fx "${aux}" is a real aux`);
    assert((patch.effects || []).every((e) => EFFECT_BY_ID[e.id]),
      `${id}: ${aux} return effects are all in the catalogue`);
  }
}

// The trims that stop the songs clipping. These are measured values (see the peak
// apportionment in the handoff notes); if they move, the render is expected to move
// with them — but they should never quietly vanish.
assert(MIX.shop?.lanes?.kick?.gain === -6 && MIX.shop?.lanes?.hats?.gain === -6,
  'shop keeps the kick and hats trim that takes it under full scale');
assert(MIX.finale?.lanes?.kick?.gain === -2, 'finale keeps its kick trim');

// ---- the serialiser --------------------------------------------------------
const sample = {
  plumber: {
    master: -1.5,
    limiter: true,
    voice: { bassType: 'sawtooth' },
    masterEffects: [{ id: 'compressor', params: { threshold: -12, ratio: 3 } }],
    fx: {
      delay: {
        division: 0.5, feedback: 0.4, tone: 3200, level: 0.8, pan: -0.3, mute: true,
        effects: [{ id: 'filter', params: { type: 'highpass', frequency: 800, Q: 1 } }],
      },
      reverb: {
        decay: 3.4, preDelay: 0.02, level: 1.2, pan: 0.2,
        effects: [{ id: 'chorus', bypass: true, params: { depth: 0.5 } }],
      },
    },
    lanes: {
      bass: {
        gain: -2.5, pan: 0.25, mute: true,
        send: { delay: 0.5, reverb: 0.3 },
        eq: { low: 2, mid: -1.5, high: 3 },
        effects: [
          { id: 'peq', params: { f1: 90, g1: 3 } },
          { id: 'filter', bypass: true, params: { type: 'lowpass', frequency: 4200 } },
          // Dotted parameter names, which the nested compressors use to address the
          // bands inside them. They are emitted as SOURCE, so an unquoted dot here is
          // a syntax error in the file the whole game reads — the one failure mode
          // that takes everything down rather than losing one setting.
          { id: 'mbComp', params: { lowFrequency: 180, 'low.threshold': -26, 'high.knee': 8 } },
        ],
      },
      kick: { gain: 1 },
    },
  },
};

const dir = mkdtempSync(join(tmpdir(), 'mash-mix-'));
const path = join(dir, 'mix.js');
writeFileSync(path, renderMixFile(sample));
const { MIX: readBack } = await import(path);
const wrote = readBack.plumber;
const sent = sample.plumber;

assert(wrote.master === sent.master && wrote.limiter === sent.limiter,
  'round-trip: master trim and limiter survive');
assert(JSON.stringify(wrote.voice) === JSON.stringify(sent.voice),
  'round-trip: voice overrides survive');
assert(JSON.stringify(wrote.masterEffects) === JSON.stringify(sent.masterEffects),
  'round-trip: the master effect chain survives');
assert(JSON.stringify(wrote.lanes.bass.effects) === JSON.stringify(sent.lanes.bass.effects),
  'round-trip: a channel effect chain survives, bypass flags and string params included');
assert(JSON.stringify(wrote.lanes.bass.eq) === JSON.stringify(sent.lanes.bass.eq)
  && JSON.stringify(wrote.lanes.bass.send) === JSON.stringify(sent.lanes.bass.send)
  && wrote.lanes.bass.pan === sent.lanes.bass.pan && wrote.lanes.bass.mute === true,
  'round-trip: a channel keeps its gain, pan, mute, sends and EQ');
for (const aux of ['delay', 'reverb']) {
  const a = wrote.fx[aux], b = sent.fx[aux];
  assert(Object.entries(b).every(([k, v]) => (k === 'effects'
    ? JSON.stringify(a[k]) === JSON.stringify(v.map((e) => (e.params && !Object.keys(e.params).length
      ? { id: e.id, ...(e.bypass ? { bypass: true } : {}) } : e)))
    : a[k] === v)),
    `round-trip: the ${aux} send keeps every setting, its return chain included`);
}

// A mix with nothing in it should write nothing, not an entry full of defaults.
const { MIX: empty } = await (async () => {
  const p = join(dir, 'empty.js');
  writeFileSync(p, renderMixFile({ plumber: { master: 0, limiter: false, lanes: { bass: {} } } }));
  return import(p);
})();
assert(Object.keys(empty).length === 0,
  'a track with no decisions in it is left out of the file entirely');

// The desk shows a bypassed bus compressor on every master. Switching it on and back
// off again leaves that seed sitting in the draft, and writing it out would give
// every song in the game a masterEffects line for a chain nobody has touched.
const { MIX: seeded } = await (async () => {
  const p = join(dir, 'seeded.js');
  writeFileSync(p, renderMixFile({ plumber: { masterEffects: DEFAULT_MASTER_CHAIN() } }));
  return import(p);
})();
assert(Object.keys(seeded).length === 0,
  'the master chain the desk seeds is a starting point, not a decision, and is not written out');

const { MIX: touched } = await (async () => {
  const p = join(dir, 'touched.js');
  const on = DEFAULT_MASTER_CHAIN().map((e) => ({ ...e, bypass: false }));
  writeFileSync(p, renderMixFile({ plumber: { masterEffects: on } }));
  return import(p);
})();
assert(touched.plumber?.masterEffects?.length === 1 && !touched.plumber.masterEffects[0].bypass,
  'switching the seeded master compressor ON is a decision, and is written out');

// ---- defaults --------------------------------------------------------------
// Both sends shut. A lane used to default to the echo if it was a melodic one, which
// is how a channel could echo with nothing in its entry accounting for it; each
// song's echo is per-channel data now.
assert(LANE_DEFAULTS.send.delay === 0 && LANE_DEFAULTS.send.reverb === 0,
  'a lane defaults to no send at all — echo is something a mix asks for');

// The bug that hid every one of those sends the first time they were written: the
// serialiser treated `delay: 1` as the default and dropped it, so the value the
// engine used never reached the file.
const { MIX: unity } = await (async () => {
  const p = join(dir, 'unity.js');
  writeFileSync(p, renderMixFile({ plumber: { lanes: { lead: { send: { delay: 1 } } } } }));
  return import(p);
})();
assert(unity.plumber?.lanes?.lead?.send?.delay === 1,
  'round-trip: a send at 1 is written out, not mistaken for a default');
assert(Object.keys(AUX_DEFAULTS).every((id) => auxIds.has(id))
  && AUXES.every((a) => AUX_DEFAULTS[a.id]),
  'every aux has defaults and every set of defaults has an aux');

console.log(failed ? '\nMIX: FAILED' : '\nMIX: PASSED');
process.exit(failed ? 1 : 0);
