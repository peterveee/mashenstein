// Region treatments on musical parts. All positions are song sixteenths.
export const REGION_FX_STYLES = new Set(['big-room', 'future-bass', 'chipstep', 'downtempo', 'lo-fi', 'lofi', 'nu-disco', 'disco', 'funk', 'shibuya']);

export function styleSectionRequests({ id, form, kindOf, start, end, active, mode, wetScale }) {
  const out = [];
  const chorus = () => ({ id: 'chorus2', params: { frequency: 0.65, delayMs: 16, depth: 0.3, width: 0.8, feedback: 0, wet: 0.18 } });
  const echo = () => ({ id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.22, wet: 0.18 } });
  const repeat = () => ({ id: 'stutter', params: { slice: mode === 'wild' ? 0.25 : 0.5, retrigger: 0, fade: -3, stop: 0 } });
  const add = (f, roles, treatment, chain, lastSteps = null) => {
    const role = roles.find(r => active(f, r));
    if (role) out.push({ role, f, a: lastSteps == null ? start(f) : Math.max(start(f), end(f) - lastSteps),
      z: end(f), chain, treatment, styled: true, wetScale, origin: 'Automatic' });
  };
  let builds = 0;
  for (const f of form) {
    const rawKind = kindOf(f);
    // Groove forms have no named verses or drops: their energy supplies the role.
    const kind = rawKind === 'groove' ? (['downtempo', 'lo-fi', 'lofi'].includes(id) || (f.energy ?? 0.6) < 0.65 ? 'verse' : 'chorus')
      : rawKind === 'halfDrop' ? 'drop' : rawKind;
    const quiet = ['breakdown', 'middle8'].includes(kind);
    if (kind === 'build') builds++;
    if (id === 'big-room') {
      if (kind === 'build') {
        add(f, ['saws', 'pad', 'arp'], 'Big Room build opening', [{ id: 'filter', params: {
          type: 'lowpass', frequency: mode === 'subtle' ? 1600 : 650, Q: 0.7, sweep: 1, sweepTo: 14000 } }]);
        add(f, ['hook', 'square', 'arp'], 'Big Room pre-drop repeat', [repeat()], mode === 'wild' ? 8 : 4);
      }
    } else if (id === 'future-bass') {
      if (quiet) add(f, ['saws', 'pad'], 'Future Bass breakdown chorus', [chorus()]);
      if (['drop', 'chorus', 'verse'].includes(kind)) add(f, ['hook', 'square'], 'Future Bass phrase echo', [echo()], 8);
      if (kind === 'build' && builds >= 2) add(f, ['saws', 'pad', 'arp'], 'Future Bass second-drop gate', [{ id: 'rhythmgate', params: {
        division: 0.5, gateLength: 0.65, attack: 0.006, decay: 0.06, depth: mode === 'subtle' ? 0.3 : 0.55 } }], 16);
    } else if (id === 'chipstep') {
      if (kind === 'build') {
        add(f, ['arp', 'square', 'hook'], 'Chipstep transition crunch', [{ id: 'bitcrusher', params: {
          bits: mode === 'wild' ? 5 : 8, downsample: 2, wet: 0.24 } }], 8);
        add(f, ['saws', 'hook', 'square'], 'Chipstep transition repeat', [repeat()], 4);
      }
    } else if (['downtempo', 'lo-fi', 'lofi'].includes(id)) {
      if (['intro', 'verse'].includes(kind)) add(f, ['piano', 'saws', 'pad', 'hook'], 'Lo-Fi soft colour', [
        { id: 'filter', params: { type: 'lowpass', frequency: 4500, Q: 0.7 } }, chorus()]);
      if (['outro', 'verse', 'breakdown'].includes(kind)) add(f, ['hook', 'piano', 'bell'], 'Lo-Fi last-phrase echo', [echo()], 8);
    } else {
      if (['verse', 'intro'].includes(kind)) add(f, ['saws', 'piano', 'hook'], 'Disco short room', [
        { id: 'reverb', params: { decay: 0.65, preDelay: 0.012, wet: 0.12 } }]);
      if (['chorus', 'drop'].includes(kind)) add(f, ['saws', 'piano'], 'Disco chord phaser', [{ id: 'phaser', params: {
        rateSync: 1, rateDivision: 8, octaves: 2, baseFrequency: 450, feedback: 0.12, wet: 0.18 } }], 32);
      if (['build', 'verse', 'outro'].includes(kind)) add(f, ['hook', 'piano', 'bell'], 'Disco phrase throw', [echo()], 4);
    }
  }
  return out;
}

// Shape automatic treatments only; saved and explicit region settings stay exact.
export function colourSectionChain(chain, mood) {
  const dark = ['dark', 'moody', 'gothic'].includes(mood);
  const dreamy = ['dreamy', 'nostalgic', 'bittersweet', 'wonder'].includes(mood);
  const bright = ['euphoric', 'uplifting', 'heroic', 'anthemic'].includes(mood);
  const playful = ['funky', 'boogie', 'playful'].includes(mood);
  for (const e of chain) {
    const p = e.params || {};
    if (e.id === 'filter') {
      if (dark) { p.frequency = Math.min(p.frequency, 3000); if (p.sweepTo) p.sweepTo = Math.min(p.sweepTo, 6500); }
      if (dreamy && !p.sweep) p.frequency = Math.min(p.frequency, 5000);
      if (bright && p.sweep) p.sweepTo = Math.max(p.sweepTo || 0, 14000);
    }
    if (e.id === 'reverb' && dreamy) p.decay = Math.min(4, p.decay * 1.25);
    if (['delay', 'pingpong'].includes(e.id)) {
      if (dark) { p.feedback *= 0.75; p.wet *= 0.8; }
      if (dreamy) p.feedback = Math.min(0.4, p.feedback + 0.05);
      if (playful) { p.division = 0.5; p.feedback *= 0.75; }
    }
    if (e.id === 'chorus2') {
      if (bright) p.width = 1;
      if (dreamy) { p.frequency = 0.4; p.tone = 5000; }
    }
    if (e.id === 'stutter' && playful) p.slice = 0.25;
  }
  return chain;
}

/** Conservative echo budget for newly generated treatments. Tone delays use an
 * equal-power wet control: tan(wet * pi/2) is the wet/dry amplitude ratio.
 * Include the geometric feedback tail rather than limiting the first repeat only.
 * This is a parameter bound, not a measurement of the complete rendered mix.
 */
export function limitSectionEchoes(chain, { mode, busy = false, send = 0 }) {
  const budget = { subtle: 0.14, expressive: 0.2, wild: 0.25 }[mode];
  if (budget == null) return chain;
  const echoes = chain.filter(e => ['delay', 'pingpong'].includes(e.id));
  const available = budget * (busy ? 0.65 : 1) / (1 + 2 * Math.max(0, Number(send) || 0));
  for (const effect of echoes) {
    const p = effect.params;
    p.feedback = Math.max(0, Math.min(0.28, p.feedback ?? 0.25));
    const cap = 2 / Math.PI * Math.atan(available * (1 - p.feedback) / echoes.length);
    p.wet = Math.max(0, Math.min(p.wet ?? 0, cap));
  }
  return chain;
}

/** Each take chooses among suitable moments. Named streams keep replay exact and
 * leave the note-generation random streams untouched. Distinct treatments get
 * priority, so repeated builds cannot consume the entire allowance.
 */
export function chooseSectionRequests(candidates, count, rng) {
  const ranked = candidates.map(candidate => {
    const draw = rng.stream(`region-fx:${candidate.treatment}:${candidate.f.id || candidate.f.role}:${candidate.f.from}`);
    return { candidate, rank: draw.next(), strength: 0.8 + draw.next() * 0.2 };
  }).sort((a, b) => a.rank - b.rank);
  const seen = new Set(), first = [], repeats = [];
  for (const item of ranked) {
    (seen.has(item.candidate.treatment) ? repeats : first).push(item);
    seen.add(item.candidate.treatment);
  }
  return [...first, ...repeats].slice(0, count).map(({ candidate, strength }) => ({
    ...candidate, wetScale: candidate.wetScale * strength,
  }));
}
