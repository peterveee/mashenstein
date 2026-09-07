/*
 * JMJR-4 SPEAK — typed English into a phoneme sequence with a sentence melody.
 *
 * A port of the reference front end (work/local/robot_voice_ui.py: tokenize, pronounce,
 * elongate, phrase_to_seq, contour), function for function, so a phrase compiled on the
 * desk is the phrase the Python would have compiled; tests/jmjr4-text.js holds the two
 * against fixtures the Python wrote. Every table it reads lives in data.js under `text`
 * (the exporter writes both front ends' copy from one source), so nothing is spelled twice.
 *
 * Pure functions: the dictionary is an argument (`lex`, `{ word: 'ARPAbet with stress' }`,
 * see `compactDict`), and so is the data. `compilePhrase` is the one entry the desk needs:
 * text and the SPEAK pots in, a renderable IR out, the same IR schema a sung syllable is.
 */
import { compileSeq } from './syll.js';

export const JMJR4_SPEAK_ENDINGS = ['fall', 'rise', 'flat'];
export const JMJR4_SPEAK_STEPS = [0, 1, 2, 3];

// ---- lexicon ---------------------------------------------------------------------

/**
 * CMUdict's text (`word  PRON # comment` per line) into `{ word: pron }`, alternates
 * (`word(2)`) dropped — the Python's `lexicon()`, so both sides agree on which reading a
 * word gets. The server caches the result as JSON; a static desk compacts in the page.
 */
export function compactDict(text) {
  const d = {};
  for (let line of text.split('\n')) {
    const hash = line.indexOf('#');
    if (hash >= 0) line = line.slice(0, hash);
    line = line.trim();
    if (!line) continue;
    const sp = line.indexOf(' ');
    const word = sp < 0 ? line : line.slice(0, sp);
    if (word.includes('(')) continue;
    d[word] = sp < 0 ? '' : line.slice(sp + 1).trim();
  }
  return d;
}

export function numberWords(n, T) {
  if (n < 20) return [T.ones[n]];
  if (n < 100) return [T.tens[Math.floor(n / 10)], ...(n % 10 ? [T.ones[n % 10]] : [])];
  if (n < 1000) return [T.ones[Math.floor(n / 100)], 'hundred', ...(n % 100 ? numberWords(n % 100, T) : [])];
  return String(n).split('').map((c) => T.ones[Number(c)]);
}

const isDigit = (c) => c >= '0' && c <= '9';

/** Last-resort letter-to-sound for words nobody listed. Rough on purpose. */
export function lettersToSound(word, T) {
  const out = [];
  let stressed = false;
  const w = word.length > 3 && word.endsWith('e') ? word.replace(/e+$/, '') : word;
  let i = 0;
  while (i < w.length) {
    let matched = false;
    for (const [pat, ph] of T.l2s) {
      if (w.startsWith(pat, i)) {
        for (let p of ph.split(' ')) {
          if (isDigit(p[p.length - 1])) { p = p.slice(0, -1) + (stressed ? '0' : '1'); stressed = true; }
          out.push(p);
        }
        i += pat.length;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }
  return out.join(' ');
}

const SIBILANT_END = new Set(['S', 'Z', 'SH', 'ZH', 'CH', 'JH']);

/** -> { arpa, known } */
export function pronounce(word, lex, T) {
  const w = word.toLowerCase();
  for (const form of [w, w.replace(/'/g, '')]) {
    if (Object.prototype.hasOwnProperty.call(T.overrides, form)) return { arpa: T.overrides[form], known: true };
    if (Object.prototype.hasOwnProperty.call(lex, form)) return { arpa: lex[form], known: true };
  }
  if (/^\d+$/.test(w)) {
    return { arpa: numberWords(Number(w), T).map((x) => (Object.prototype.hasOwnProperty.call(lex, x) ? lex[x] : lettersToSound(x, T))).join(' '), known: true };
  }
  // a possessive or plural the lexicon lacks: say the stem, then the ending
  if (w.endsWith("'s")) {
    const stem = w.slice(0, -2);
    const has = (d, k) => Object.prototype.hasOwnProperty.call(d, k);
    if (has(lex, stem) || has(T.overrides, stem)) {
      const base = has(T.overrides, stem) ? T.overrides[stem] : lex[stem];
      const last = base.split(' ').pop();
      return { arpa: base + (SIBILANT_END.has(last) ? ' IH0 Z' : ' Z'), known: true };
    }
  }
  return { arpa: lettersToSound(w, T), known: false };
}

/**
 * Curly apostrophes become straight ones so contractions reach the dictionary, and a
 * hyphen inside a token is closed up when that makes a name the lexicon knows
 * (B-33P -> b33p). Everything else keeps its hyphen as a word break.
 */
export function normalise(text, lex, T) {
  for (const ch of T.apostrophes) text = text.split(ch).join("'");
  return text.replace(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g, (m) => {
    const joined = m.replace(/-/g, '');
    const k = joined.toLowerCase();
    return (Object.prototype.hasOwnProperty.call(T.overrides, k) || Object.prototype.hasOwnProperty.call(lex, k)) ? joined : m;
  });
}

/**
 * Words and pause tokens: [kind, value] with kind `word`, `word!` (*emphasised*), `clause`
 * (a comma) or `end` ('.', '?' or '!'). Apostrophes stay inside a word: CMUdict lists
 * don't, isn't and won't.
 */
export function tokenize(text, lex, T) {
  const toks = [];
  text = normalise(text, lex, T);
  for (const m of text.matchAll(/\*[A-Za-z0-9']+\*|[A-Za-z0-9]+(?:'[A-Za-z]+)*|[,.;:?!…]+|-/g)) {
    const s = m[0];
    if (s === '-') continue;
    if (s.startsWith('*')) toks.push(['word!', s.replace(/^\*+|\*+$/g, '')]);
    else if (/^[A-Za-z0-9]/.test(s)) toks.push(['word', s]);
    else if (s.includes('?')) toks.push(['end', '?']);
    else if (s.includes('!')) toks.push(['end', '!']);
    else if (/[.;:…]/.test(s)) toks.push(['end', '.']);
    else toks.push(['clause', ',']);
  }
  return toks;
}

/**
 * A held word, spelled the way anyone would type it: "meeeee". A run only counts as a
 * hold from the THIRD letter on, and the word is looked up with the run collapsed.
 * -> { spelled, hold }
 */
export function elongate(word, T) {
  const out = [];
  let extra = 0;
  let i = 0;
  while (i < word.length) {
    let j = i;
    while (j < word.length && word[j].toLowerCase() === word[i].toLowerCase()) j++;
    const run = j - i;
    if (run >= 3) { extra += run - 2; out.push(word[i] + word[i]); } else out.push(word.slice(i, j));
    i = j;
  }
  return { spelled: out.join(''), hold: Math.min(T.hold_max, 1 + T.hold_per_letter * extra) };
}

const STRESS_MUL = { 1: 1.35, 2: 1.15, 0: 0.85 };
const EMPH_MUL = { '-1': 0.8, 0: 1.0, 1: 1.2 };

/**
 * -> { seq: [[name, seconds], ...] for compileSeq, spans: [{kind:'v', s, e, stress} |
 * {kind:'pause', s, e, mark}], transcript, unknown }. A token is [kind, value]; `arpa`
 * tokens carry a resolved pronunciation of their own.
 */
export function phraseToSeq(data, tokens, lex, speed = 1) {
  const T = data.text;
  const PH = data.phonemes;
  const DUR = data.timing.dur;
  if (!Number.isFinite(speed) || speed < T.speed_min || speed > T.speed_max) {
    throw new Error(`speed must be between ${T.speed_min} and ${T.speed_max}, got ${speed}`);
  }
  const vowels = new Set(T.vowels);
  const fw = new Set(T.function_words);
  const seq = [];
  const spans = [];
  const transcript = [];
  const unknown = [];
  // first pass: phones per word so phrase-final lengthening can look ahead
  const words = [];
  for (const tok of tokens) {
    const [kind, val] = tok;
    if (kind === 'pause') { words.push({ kind: 'pause', secs: val, mark: '.' }); continue; }
    if (kind === 'end' || kind === 'clause') { words.push({ kind: 'pause', secs: data.timing.pause[kind === 'end' ? val : 'clause'], mark: val }); continue; }
    let emph = 0;
    let hold = 1;
    let arpa;
    let known;
    let label;
    if (kind === 'arpa') { arpa = val; known = true; label = val; } else {
      const e = elongate(val, T);
      hold = e.hold;
      ({ arpa, known } = pronounce(e.spelled, lex, T));
      if (!known && e.spelled !== val) {
        // "mee" is no word either; try "me"
        const again = pronounce(e.spelled.replace(/(.)\1+/g, '$1'), lex, T);
        if (again.known) ({ arpa, known } = again);
      }
      label = `${val}: ${arpa}`;
      if (kind === 'word!') emph = 1;
      else if (fw.has(val.toLowerCase())) emph = -1;
    }
    if (!known) unknown.push(val);
    const bad = arpa.split(' ').filter((x) => x && !(Object.prototype.hasOwnProperty.call(T.arpa, isDigit(x[x.length - 1]) ? x.slice(0, -1) : x)));
    if (bad.length) throw new Error(`unknown ARPAbet symbol(s): ${bad.join(', ')}`);
    let phones = arpa.split(' ').filter(Boolean);
    if (emph < 0) phones = phones.map((p) => ('12'.includes(p[p.length - 1]) ? p.slice(0, -1) + '0' : p));
    else if (emph > 0) phones = phones.map((p) => ('02'.includes(p[p.length - 1]) ? p.slice(0, -1) + '1' : p));
    words.push({ kind: 'word', phones, emph, hold });
    transcript.push(label);
  }
  let t = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const item = words[wi];
    if (item.kind === 'pause') {
      const d = item.secs / speed;
      seq.push(['_', d]);
      spans.push({ kind: 'pause', s: t, e: t + d, mark: item.mark });
      t += d;
      continue;
    }
    const { phones, emph, hold } = item;
    const finalWord = wi + 1 >= words.length || words[wi + 1].kind === 'pause';
    let lastVowel = -1;
    phones.forEach((p, i) => { if (vowels.has(p.replace(/[012]$/, ''))) lastVowel = i; });
    for (let i = 0; i < phones.length; i++) {
      const p = phones[i];
      const hasStress = isDigit(p[p.length - 1]);
      const base = hasStress ? p.slice(0, -1) : p;
      const stress = hasStress ? Number(p[p.length - 1]) : -1;
      const name = base === 'AH' && stress === 0 ? 'AX' : T.arpa[base];
      const isV = vowels.has(base);
      let d;
      if (isV) {
        d = DUR[name] ?? 0.12;
        d *= STRESS_MUL[stress] ?? 1.0;
        d *= EMPH_MUL[emph];
        if (finalWord && i === lastVowel) d *= 1.4;
        if (i === lastVowel) d *= hold;
      } else {
        d = DUR[name] ?? 0.07;
        if (finalWord && i > lastVowel) d *= 1.3;
      }
      // speed first, THEN the floor
      d /= speed;
      const k = PH[name].k;
      if (k === 'S') d = Math.max(d, data.timing.min_closure + data.timing.min_burst);
      else if (k === 'F') d = Math.max(d, 0.03);
      else if (k === 'V' || k === 'H' || k === 'B') d = Math.max(d, 0.02);
      seq.push([name, d]);
      if (isV) spans.push({ kind: 'v', s: t, e: t + d, stress });
      t += d;
    }
    if (!finalWord) {
      // an ordinary word boundary is a dip, not silence
      seq.push(['|', data.timing.word_gap / speed]);
      t += data.timing.word_gap / speed;
    }
  }
  return { seq, spans, transcript, unknown };
}

// ---- contour -------------------------------------------------------------------------

/** numpy's interp: linear between the points, clamped to the end values outside them. */
function interp(x, xs, ys) {
  if (x <= xs[0]) return ys[0];
  const n = xs.length;
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (i < n && xs[i] < x) i++;
  const x0 = xs[i - 1];
  const x1 = xs[i];
  return x1 === x0 ? ys[i] : ys[i - 1] + (ys[i] - ys[i - 1]) * (x - x0) / (x1 - x0);
}
/** numpy's round: half to even. */
const roundHalfEven = (x) => {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
};

/**
 * -> [[seconds, Hz], ...]. Every gesture is in SEMITONES so a voice at 94 Hz and one at
 * 178 Hz make the same shape. Each sentence has its own declination and its own ending; a
 * clause boundary gets a small continuation rise. `question` null reads the punctuation;
 * true/false forces the last sentence.
 */
export function contour(data, total, spans, { f0 = 118, range = 1, question = null, declSt = -3, finalSt = -4, stepSt = 0 } = {}) {
  const P = data.text.prosody;
  const STEP = 0.005;
  const n = Math.ceil((total + STEP) / STEP);
  const grid = Array.from({ length: n }, (_, i) => i * STEP);
  const st = new Float64Array(n);
  // split into sentences at sentence-final pauses
  const sentences = [];
  let cur = [];
  for (const sp of spans) {
    if (sp.kind === 'pause' && (sp.mark === '.' || sp.mark === '?' || sp.mark === '!')) {
      if (cur.length) sentences.push({ items: cur, ending: sp.mark });
      cur = [];
    } else cur.push(sp);
  }
  if (cur.length) sentences.push({ items: cur, ending: null });
  for (let si = 0; si < sentences.length; si++) {
    const { items, ending } = sentences[si];
    const vs = items.filter((x) => x.kind === 'v');
    if (!vs.length) continue;
    const s0 = vs[0].s;
    const s1 = vs[vs.length - 1].e;
    for (let i = 0; i < n; i++) {
      if (grid[i] >= s0 - 0.03 && grid[i] <= s1 + 0.03) st[i] += interp(grid[i], [s0, s1], [0, declSt]);
    }
    let first = true;
    for (const v of vs) {
      const h0 = P.accent_st[String(v.stress)];
      if (h0 == null) continue;
      const h = h0 * (first && v.stress === 1 ? P.first_accent_bonus : 1);
      if (v.stress === 1) first = false;
      const a = v.s;
      const b = v.e;
      for (let i = 0; i < n; i++) {
        const g = grid[i];
        if (g < a - 0.03 || g > b + 0.03) continue;
        st[i] += interp(g, [a - 0.03, a + 0.4 * (b - a), b + 0.03], [0, h, h * 0.2]);
      }
    }
    // clause boundaries inside this sentence: a continuation rise on the vowel before
    for (const x of items) {
      if (x.kind !== 'pause' || x.mark !== ',') continue;
      const prev = vs.filter((v) => v.e <= x.s + 1e-6);
      if (!prev.length) continue;
      const pa = prev[prev.length - 1].s;
      const pb = prev[prev.length - 1].e;
      const mid = pa + 0.5 * (pb - pa);
      for (let i = 0; i < n; i++) {
        const g = grid[i];
        if (g < mid || g > pb) continue;
        st[i] += interp(g, [mid, pb], [0, P.continuation_st]);
      }
    }
    // the sentence ending, on its last voiced region
    const last = si === sentences.length - 1;
    const q = question == null || !last ? ending === '?' : question;
    const excl = ending === '!' && !(question && last);
    const la = vs[vs.length - 1].s;
    const lb = vs[vs.length - 1].e;
    let a0;
    let amt;
    if (q) {
      const stressed = [...vs].reverse().find((v) => v.stress === 1);
      a0 = stressed ? stressed.s : la;
      a0 = Math.min(a0, Math.max(0, lb - 0.05));
      amt = P.question_st;
    } else {
      a0 = Math.max(la, lb - 0.18);
      amt = excl ? P.exclaim_st : finalSt;
    }
    for (let i = 0; i < n; i++) {
      const g = grid[i];
      if (g < s0) continue;
      st[i] += g < a0 ? 0 : g > lb ? amt : interp(g, [a0, lb], [0, amt]);
    }
    // hold flat until the next sentence starts
    const nxt = si + 1 < sentences.length ? sentences[si + 1].items : null;
    const nstart = nxt ? (nxt.find((v) => v.kind === 'v')?.s ?? total) : grid[n - 1] + 1;
    const level = interp(lb, grid, st);
    for (let i = 0; i < n; i++) if (grid[i] > lb && grid[i] <= nstart) st[i] = level;
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let s = st[i] * range;
    if (stepSt > 0) s = roundHalfEven(s / stepSt) * stepSt;
    out.push([grid[i], f0 * Math.pow(2, s / 12)]);
  }
  return out;
}

/**
 * The contour with its straight runs collapsed to their end points: the 5 ms grid the
 * reference draws on is a sampling of a piecewise-linear curve (declination lines, accent
 * bumps, the ending gesture, and the flat holds between), so the points inside a run say
 * nothing the renderer's linear ramp would not say itself. Judged in semitones, within
 * `tolSt`, so a preset carries a phrase in a few kilobytes rather than tens. Lossless to a
 * thousandth of a semitone by default, which is under the tolerance tests/jmjr4-text.js
 * holds the contour itself to.
 */
export function thinContour(points, tolSt = 1e-3) {
  if (points.length < 3) return points.slice();
  const st = points.map(([, hz]) => 12 * Math.log2(hz));
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const walk = (a, b) => {
    // Douglas–Peucker in (seconds, semitones)
    let worst = -1;
    let at = -1;
    const [ta, sa] = [points[a][0], st[a]];
    const [tb, sb] = [points[b][0], st[b]];
    for (let i = a + 1; i < b; i++) {
      const s = tb === ta ? sa : sa + (sb - sa) * (points[i][0] - ta) / (tb - ta);
      const d = Math.abs(st[i] - s);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tolSt) { keep[at] = true; walk(a, at); walk(at, b); }
  };
  walk(0, points.length - 1);
  return points.filter((_, i) => keep[i]);
}

/**
 * An IR as a preset stores it: without `schedule` (the compiler's own account of the
 * segments, which the renderer never reads) and with its numbers at five decimals — ten
 * microseconds, a hundred-thousandth of a hertz — so a six-word phrase and its words sit
 * in a preset in ten kilobytes rather than forty. What the renderer reads is untouched.
 */
export function compactIr(ir) {
  const { schedule, ...rest } = ir;
  return JSON.parse(JSON.stringify(rest, (k, x) => (typeof x === 'number' && !Number.isInteger(x) ? Number(x.toFixed(5)) : x)));
}

// ---- the phrase ----------------------------------------------------------------------

/**
 * Text and the SPEAK pots in, a renderable IR out — the reference's `render()` for one
 * request, minus the audio. `ctl` is the compiled preset's control block (src, oq, fscale,
 * tilt_db, asp, flutter, sibilance, nasal_buzz, bw); `voice` is the data's voice table
 * entry, which supplies the sentence melody's declination, final fall, and the stops'
 * release. Throws on a phrase with nothing to say or an ARPAbet symbol the table lacks.
 */
export function compilePhrase(data, lex, { text, voice, speed = 1, pitchHz = 118, range = 1, ending = 'fall', step = 0, ctl = {}, seed = 7 }) {
  const T = data.text;
  const tokens = tokenize(text, lex, T);
  // The reference strips only the legacy plain-seconds pause kind here, which tokenize never
  // makes: a trailing full stop or question mark STAYS, because the sentence melody reads
  // its ending off it.
  while (tokens.length && tokens[tokens.length - 1][0] === 'pause') tokens.pop();
  while (tokens.length && tokens[0][0] === 'pause') tokens.shift();
  const v = voice || {};
  const spd = speed * (v.speed ?? 1);
  const { seq, spans, transcript, unknown } = phraseToSeq(data, tokens, lex, spd);
  if (!seq.length) throw new Error('nothing to say');
  const total = seq.reduce((s, [, d]) => s + d, 0);
  const f0pts = contour(data, total, spans, {
    f0: pitchHz, range: ending === 'flat' ? 0 : range, question: ending === 'rise',
    declSt: v.decl_st ?? -3, finalSt: v.final_st ?? -4, stepSt: step,
  });
  const rel = v.release ?? 1;
  const PH = data.phonemes;
  const seqOut = seq.map(([name, d]) => (PH[name].k === 'S' && rel !== 1 ? [name, d, { g: PH[name].g * rel }] : [name, d]));
  const ir = compileSeq(data, seqOut, thinContour(f0pts), { ...ctl, seed });
  return { ir, transcript, unknown, seconds: total };
}
