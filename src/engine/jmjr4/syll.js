/*
 * JMJR-4 — compile a NOTE-shaped input into robot-voice-ir/1.
 *
 * A port of the reference scheduler (work/local/robot_voice.py, compile_ir) for the subset
 * a sung syllable needs: vowels and sonorants (V), stops (S), fricatives (F), aspiration
 * (H), a boundary dip (B) and silence. Every number comes from JMJR4_DATA, passed in; this
 * file holds none of its own, so the two schedulers cannot drift apart on a constant.
 *
 * Pure functions, no shared state. The prototype mutated the phoneme table to override a
 * vowel's formants for a morph (`_LIVE`); here an override rides on the sequence entry
 * itself, `[name, seconds, overrides]`, which is what the reference's own `over` argument
 * always was.
 *
 * TIME UNITS. Breakpoint times are seconds. Noise events (`extras`) are in SAMPLES at
 * `ir.sample_rate`, the data file's rate, because that is how the reference schedules a
 * burst; the renderer converts with `ir.sample_rate`, not the context's, or a 48 kHz
 * context lands every burst 8 % early.
 */

/** The syllables the panel offers as pills, spelled the way a singer writes them. */
export const JMJR4_SYLLABLES = Object.freeze([
  'ooh', 'aah', 'eeh', 'oh', 'mmm', 'doo', 'daa', 'laa', 'bah', 'wah', 'dee', 'hey',
]);
/** The vowels a note can morph towards, as the phoneme table names them. */
export const JMJR4_MORPH_TARGETS = Object.freeze([
  'OO', 'AH', 'IY', 'OH', 'EH', 'AE', 'UH', 'AW', 'M', 'ER', 'IH', 'AX',
]);
/** The same vowel spelled the same way on both rows: OOH on the pill is the OO the syllable row sings. */
export const JMJR4_VOWEL_NAMES = Object.freeze({
  OO: 'OOH', AH: 'AAH', IY: 'EEH', OH: 'OH', EH: 'EH', AE: 'AE', UH: 'UH', AW: 'AW',
  M: 'MMM', ER: 'ER', IH: 'IH', AX: 'UHH',
});

// ---- syllable text -------------------------------------------------------------
const SPELL = {
  oo: 'OO', ooh: 'OO', u: 'UH', uh: 'UH', ah: 'AH', aa: 'AH', a: 'AH', aah: 'AH', ee: 'IY',
  eeh: 'IY', i: 'IY', eh: 'EH', e: 'EH', o: 'OH', oh: 'OH', ay: 'AY', ai: 'AY', oy: 'OY',
  ow: 'OW', ae: 'AE', er: 'ER', ey: 'EY', uu: 'UU', mm: 'M', mmm: 'M',
};
const CONS = {
  d: 'D', b: 'B', g: 'G', t: 'T', k: 'K', p: 'P', l: 'L', n: 'N', m: 'M', s: 'S', z: 'Z',
  w: 'W', y: 'Y', r: 'R', h: 'H', f: 'F', v: 'V', sh: 'SH', ch: 'CH', th: 'TH', j: 'JH',
};
function cons(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    const two = str.slice(i, i + 2);
    if (CONS[two]) { out.push(CONS[two]); i += 2; } else if (CONS[str[i]]) { out.push(CONS[str[i]]); i += 1; } else i += 1;
  }
  return out;
}

/**
 * "doo" → D + OO; "laa-" → L + AH, tied over the next key; "mmm" → a hummed M held as the
 * vowel. Null for a word that is not a syllable.
 */
export function parseSyllable(word) {
  const tie = word.endsWith('-');
  word = word.replace(/-$/, '').toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return null;
  if (/^m+$/.test(word)) return { onset: [], vowel: 'M', ending: [], tie };
  const m = word.match(/^([a-z]*?)([aeiou]+[hywr]?)([a-z]*)$/);
  if (!m) return null;
  const v = m[2].replace(/(.)\1+/g, '$1$1');                 // "laaaa" -> "laa"
  const vowel = SPELL[m[2]] || SPELL[v] || SPELL[v.replace(/[hywr]$/, '')] || SPELL[v[0]] || 'AH';
  return { onset: cons(m[1]), vowel, ending: cons(m[3]), tie };
}

/** A line of syllables; words that do not parse are dropped. */
export const syllablesFromText = (text) => String(text || '').trim().split(/\s+/)
  .map(parseSyllable).filter(Boolean);

/** How long a syllable's onset consonants take, the vowel not included. */
export const onsetSeconds = (data, onset) => onset.reduce((s, o) => s + (data.timing.dur[o] ?? 0.07), 0);

// ---- the scheduler ----------------------------------------------------------------
const bp = (T, V, t, v) => {
  if (T.length && t <= T[T.length - 1]) t = T[T.length - 1] + 1e-6;
  T.push(t); V.push(v);
};

export function isVowel(data, name) {
  const p = data.phonemes[name];
  return !!p && p.k === 'V' && !data.seg.sonorants.includes(name);
}
export function segClass(data, name) {
  if (name == null) return '_';
  if (name === '|') return 'B';
  const p = data.phonemes[name];
  if (p.k === 'V') {
    if (p.nasal) return 'N';
    if (data.seg.glides.includes(name) || data.seg.liquids.includes(name)) return 'G';
    return 'V';
  }
  return p.k;
}
function transitionHalf(data, d, neighbour) {
  const tr = data.timing.tr_pair[segClass(data, neighbour)] ?? data.seg.tr / 2;
  return Math.min(tr, d * 0.45);
}
function nextVowel(data, seq, i) {
  const PH = data.phonemes;
  for (let j = i + 1; j < seq.length; j++) {
    const n = seq[j][0];
    if (PH[n].k === '_') break;
    if (isVowel(data, n)) { const f = PH[n].f; return Array.isArray(f[0]) ? f[0] : f; }
  }
  for (let j = i - 1; j >= 0; j--) {
    const n = seq[j][0];
    if (PH[n].k === '_') break;
    if (isVowel(data, n)) { const f = PH[n].f; return Array.isArray(f[0]) ? f[1] : f; }
  }
  return PH.AX.f;
}
function stopSchedule(data, d, p, nextD) {
  const t = data.timing;
  let burst = p.burst ?? t.min_burst;
  let vot = p.vot ?? 0;
  let closure;
  if (d <= t.min_closure + t.min_burst) { closure = d * 0.55; burst = Math.max(1e-4, d - closure); } else {
    burst = Math.max(Math.min(burst, d - t.min_closure), t.min_burst); closure = d - burst;
  }
  if (nextD != null) vot = Math.min(vot, Math.max(0, nextD - t.voice_lead - 0.005));
  return [closure, burst, vot];
}

/**
 * seq: [[name, seconds, overrides?], ...]; pitch: [[t, hz], ...]; ctl: control overrides
 * (oq, fscale, tilt_db, src, asp, flutter, sibilance, nasal_buzz, bw, seed …).
 */
export function compileSeq(data, seq, pitch, ctl = {}) {
  const PH = data.phonemes;
  const T = data.timing;
  const sr = data.sample_rate;
  const total = seq.reduce((s, x) => s + x[1], 0);
  const n = Math.floor(total * sr);
  const fT = []; const f1 = []; const f2 = []; const f3 = [];
  const vT = [0]; const vv = [0]; const aT = [0]; const av = [0]; const bT = [0]; const bv = [0];
  const [fnp] = data.tract.nasal_pole;
  const zT = [0]; const zv = [fnp];
  const extras = []; const schedule = [];
  const fbp = (t, f) => { bp(fT, f1, t, f[0]); f2.push(f[1]); f3.push(f[2]); };
  const burst = (at, dur, p, shape, voiced) => {
    let m = Math.max(1, Math.floor(dur * sr));
    const st = Math.min(Math.floor(at * sr), Math.max(0, n - 1));
    m = Math.min(m, n - st);
    if (m < 1) return;
    const spec = p.spec ? p.spec.map((x) => x.slice()) : [[p.c, p.q, 1.0]];
    extras.push({ start: st, samples: m, spec, shape, ratio: p.g * (ctl.sibilance ?? 1), voiced: !!voiced, ph: p._name });
  };
  let vot = 0;
  let s = 0;
  for (let i = 0; i < seq.length; i++) {
    const name = seq[i][0];
    const d = seq[i][1];
    const p = Object.assign({}, PH[name], seq[i][2] || {}, { _name: name });
    const k = p.k;
    const e = s + d;
    if (k === 'V') {
      const f = p.f;
      const sweep = Array.isArray(f[0]);
      const a = sweep ? f[0] : f;
      const b = sweep ? f[1] : f;
      const prev = i > 0 ? seq[i - 1][0] : null;
      const next = i + 1 < seq.length ? seq[i + 1][0] : null;
      if (data.seg.glides.includes(name)) fbp(s + d * 0.5, a);
      else if (sweep) {
        const [h0, mv] = p.move || [0.30, 0.45];
        const trIn = transitionHalf(data, d, prev);
        const trOut = transitionHalf(data, d, next);
        const m0 = Math.max(s + trIn, s + d * h0);
        const m1 = Math.min(e - trOut, m0 + d * mv);
        fbp(s + trIn, a); fbp(m0, a); fbp(m1, b); fbp(e - trOut, b);
      } else { fbp(s + transitionHalf(data, d, prev), a); fbp(e - transitionHalf(data, d, next), b); }
      const amp = p.amp ?? 1.0;
      if (p.nasal) {
        const lead = Math.min(data.seg.nasalise, Math.max(0, s - zT[zT.length - 1]));
        if (lead > 0) bp(zT, zv, s - lead, fnp);
        bp(zT, zv, s + 0.005, p.nz); bp(zT, zv, e - 0.005, p.nz);
        const nx = i + 1 < seq.length ? seq[i + 1] : null;
        const tail = nx && PH[nx[0]].k === 'V' ? Math.min(data.seg.nasalise, nx[1] * 0.5) : 0.005;
        bp(zT, zv, Math.min(e + tail, total), fnp);
      }
      const lead = Math.min(T.voice_lead, Math.max(1e-4, d * 0.4));
      const on = Math.min(s + vot, e - lead);
      if (vot > 0) bp(vT, vv, on, 0);
      bp(vT, vv, on + lead, amp); bp(vT, vv, Math.max(on + lead + 1e-4, e - 0.015), amp);
      const aspOff = Math.min(Math.max(s + vot + 0.02, aT[aT.length - 1]), e);
      bp(aT, av, aspOff, 0); bp(aT, av, Math.max(aspOff, e - 0.02), 0);
      schedule.push({ i, ph: name, kind: 'V', start: s, end: e, voice_on: on + lead, vot_in: vot });
      vot = 0;
    } else if (k === 'H') {
      const f = nextVowel(data, seq, i);
      fbp(s + Math.min(0.01, d / 2), f); fbp(e, f);
      bp(vT, vv, s, 0); bp(vT, vv, e, 0.3);
      bp(aT, av, s + Math.min(0.005, d / 4), 0.7); bp(aT, av, e, 0.2);
      schedule.push({ i, ph: name, kind: 'H', start: s, end: e });
      vot = 0;
    } else if (k === 'F') {
      fbp(s, p.locus); fbp(e, p.locus);
      if (p.voiced) {
        const pad = Math.min(0.01, d / 4);
        bp(vT, vv, s, 0); bp(vT, vv, s + pad, 0.35); bp(vT, vv, e - pad, 0.35); bp(vT, vv, e, 0);
      } else { bp(vT, vv, s, 0); bp(vT, vv, e, 0); }
      bp(aT, av, Math.max(s, aT[aT.length - 1]), 0); bp(aT, av, e, 0);
      burst(s, d, p, ['asr', 0.030, 0.040], p.voiced);
      schedule.push({ i, ph: name, kind: 'F', start: s, end: e, voiced: !!p.voiced });
      vot = 0;
    } else if (k === 'S') {
      const nextName = i + 1 < seq.length ? seq[i + 1][0] : null;
      const nextD = nextName ? seq[i + 1][1] : null;
      if ((name === 'K' || name === 'G') && nextName && isVowel(data, nextName)) {
        let nf = PH[nextName].f; nf = Array.isArray(nf[0]) ? nf[0] : nf;
        p.c = Math.min(3200, Math.max(1400, nf[1] * 1.15));
      }
      if (!nextName || ['_', 'B'].includes(segClass(data, nextName))) {
        p.g = p.g * 0.5; p.vot = Math.min(p.vot ?? 0, 0.02);
      } else if (i === 0 || ['_', 'B'].includes(segClass(data, seq[i - 1][0]))) {
        // word-initial, into a vowel: the burst IS the consonant (the reference's ONSET_BURST)
        p.g = p.g * (data.timing.onset_burst ?? 1.7);
      }
      let [closure, bl, votS] = stopSchedule(data, d, p, nextD);
      const intoVowel = !!nextName && isVowel(data, nextName);
      if (!intoVowel) votS = 0;
      const rel = s + closure;
      fbp(s, p.locus); fbp(rel, p.locus);
      bp(vT, vv, s, 0); bp(vT, vv, e, 0);
      if (p.voiced) {
        bp(bT, bv, s, 0); bp(bT, bv, Math.min(s + 0.004, rel), 0.3);
        bp(bT, bv, rel, 0.3); bp(bT, bv, rel + Math.min(0.003, bl), 0);
      }
      vot = votS;
      const ra = data.levels.release_asp ?? 0.32;
      const rt = data.levels.release_asp_tail ?? 0.09;
      bp(aT, av, Math.max(s, aT[aT.length - 1]), 0); bp(aT, av, rel, 0);
      bp(aT, av, rel + Math.min(0.003, bl / 2), ra); bp(aT, av, e + vot, intoVowel ? rt : 0);
      burst(rel, bl, p, ['ad', 0.006, bl], false);
      schedule.push({ i, ph: name, kind: 'S', start: s, end: e, closure, burst: bl, vot: votS });
    } else if (k === 'B') {
      bp(vT, vv, s + d * 0.5, p.dip ?? 0.55);
      bp(aT, av, Math.max(s, aT[aT.length - 1]), 0); bp(aT, av, e, 0);
      schedule.push({ i, ph: name, kind: 'B', start: s, end: e });
      vot = 0;
    } else {
      bp(vT, vv, s, 0); bp(vT, vv, e, 0);
      bp(aT, av, Math.min(Math.max(s, aT[aT.length - 1]) + 0.015, e), 0); bp(aT, av, e, 0);
      schedule.push({ i, ph: name, kind: '_', start: s, end: e });
      vot = 0;
    }
    s = e;
  }
  bp(vT, vv, total, 0); bp(aT, av, total, 0); bp(bT, bv, total, 0);
  if (zT[zT.length - 1] < total) bp(zT, zv, total, fnp);
  if (!fT.length) fbp(0, PH.AX.f);
  const tr = data.tract;
  const lv = data.levels;
  const src = data.source;
  const controls = Object.assign({
    src: 'glottal', oq: 0.5, fscale: 1.0, asp: lv.asp, jitter: 0, flutter: 0, tilt_db: 0, chip: false, tract: 'hybrid',
    gains: tr.gains, bw: tr.bw, q: 7.0, f5: tr.f5, tilt: null, post_fir: null, f4: tr.f4,
    nasal_pole: tr.nasal_pole, nasal_zero_bw: tr.nasal_zero_bw, hybrid_high_gain: tr.hybrid_high_gain,
    nasal_buzz: 0, nasal_high: tr.nasal_high, nasal_high_max: tr.nasal_high_max,
    nasal_buzz_db: tr.nasal_buzz_db, nasal_buzz_hz: tr.nasal_buzz_hz,
    hybrid_f5_gain: tr.hybrid_f5_gain, hybrid_dep_exp: tr.hybrid_dep_exp, asp_level: lv.asp, bar_level: lv.bar,
    no_vowel_ref: lv.no_vowel_ref, tract_ref_gain: tr.tract_ref_gain.cascade, radiation: src.radiation, block: data.block,
  }, ctl);
  const ir = {
    schema: 'robot-voice-ir/1', sample_rate: sr, samples: n, total_seconds: total, seed: ctl.seed ?? 7, schedule,
    formants: { t: fT, f1, f2, f3 }, voicing: { t: vT, v: vv }, aspiration: { t: aT, v: av }, voicebar: { t: bT, v: bv },
    nasal_zero: { t: zT, v: zv, active: zv.some((v) => v !== fnp) }, pitch,
    extras: extras.map((e) => ({ start: e.start, samples: e.samples, spec: e.spec, shape: e.shape, ratio: e.ratio, voiced: e.voiced })),
    controls,
  };
  ir.levels = liveLevels(data, ir, seq, extras);
  return ir;
}

// What the reference measures from its render, derived here from the exported tables.
function liveLevels(data, ir, seq, extras) {
  const live = data.live;
  const lv = data.levels;
  const PH = data.phonemes;
  const vowels = seq.filter((x) => PH[x[0]].k === 'V').map((x) => x[0]);
  const vref = vowels.length
    ? vowels.reduce((s, v) => s + (live.vref_by_vowel[v] ?? live.vref_by_vowel.AX), 0) / vowels.length
    : lv.no_vowel_ref;
  const hs = seq.filter((x) => x[0] === 'H').length;
  const stops = seq.filter((x) => PH[x[0]].k === 'S').map((x) => x[0]);
  const parts = [];
  if (hs || !stops.length) {
    parts.push(vowels.length
      ? vowels.reduce((s, v) => s + (live.asp_rms_unit_by_vowel[v] ?? live.asp_rms_unit), 0) / vowels.length
      : live.asp_rms_unit);
  }
  for (const st of stops) parts.push(live.asp_rms_unit_after_stop[st] ?? live.asp_rms_unit);
  const aspUnit = Math.sqrt(parts.reduce((s, r) => s + r * r, 0) / parts.length);
  // BREATH is the CONTROL's `asp`, the way the reference's `asp_gain = asp * vref / ra`
  // reads it (robot_voice.py). This read the data file's constant instead, so the pot
  // compiled into every IR and moved nothing; the default (0.35) is that constant, so a
  // preset that never touched BREATH sounds exactly as it did.
  const asp = ir.controls?.asp ?? lv.asp;
  return {
    vref,
    asp_gain: asp * vref / aspUnit,
    bar_gain: lv.bar * vref / live.bar_rms_unit,
    extra_gains: extras.map((e) => { const t = live.noise[e.ph]; const r = t ? t.rms_unit : 1; return e.ratio * vref / (r || 1); }),
    derived: 'browser tables',
  };
}

/**
 * A syllable for a note: onset consonants, the vowel held for `hold` seconds, an optional
 * ending. `vowelOverride` replaces fields of the vowel's phoneme entry for this compile only
 * (a morph target's formants, a hum's amplitude) and touches nothing shared.
 */
export function syllable(data, spec) {
  const { onset = [], vowel = 'AH', ending = [], hz = 130, hold = 10, ctl = {}, vowelOverride = null } = spec;
  const dur = data.timing.dur;
  const seq = [];
  for (const o of onset) seq.push([o, dur[o] ?? 0.07]);
  seq.push(vowelOverride ? [vowel, hold, vowelOverride] : [vowel, hold]);
  for (const e of ending) seq.push([e, (dur[e] ?? 0.07) * 1.3]);
  const total = seq.reduce((s, x) => s + x[1], 0);
  return compileSeq(data, seq, [[0, hz], [total, hz]], ctl);
}
