// Web Audio: procedural SFX + a lookahead step-sequencer with per-cabinet
// pattern banks. Lazy init on first user gesture; ctx.resume() on every gesture (iOS).

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null; this.sfxGain = null; this.musicGain = null;
    this.muted = false;
    this.noiseBuf = null;
    // sequencer
    this.bpm = 112;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.bank = null;      // current pattern bank
    this.detune = 1;       // slow-mo music warp
    this.beatListeners = [];
    this.songTime = 0;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.7; this.musicGain.connect(this.master);
    // YMCK-style space: tempo-synced dotted-eighth echo on the music bus.
    // High-passed on the way in (kick/snare stay dry), low-passed in the
    // feedback loop so repeats melt into the background instead of cluttering.
    this.echoSend = this.ctx.createGain(); this.echoSend.gain.value = 0.28;
    this.echoHp = this.ctx.createBiquadFilter(); this.echoHp.type = 'highpass'; this.echoHp.frequency.value = 500;
    this.delay = this.ctx.createDelay(1.0); this.delay.delayTime.value = 0.32;
    this.delayLp = this.ctx.createBiquadFilter(); this.delayLp.type = 'lowpass'; this.delayLp.frequency.value = 2800;
    this.delayFb = this.ctx.createGain(); this.delayFb.gain.value = 0.35;
    this.musicGain.connect(this.echoSend);
    this.echoSend.connect(this.echoHp);
    this.echoHp.connect(this.delay);
    this.delay.connect(this.delayLp);
    this.delayLp.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayLp.connect(this.master);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startSequencer();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  // ---- SFX ------------------------------------------------------------------
  osc(type, f0, f1, dur, gain = 0.2, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.2, filterType = 'lowpass', freq = 800, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const combo = opt.combo || 0;
    const pitch = Math.pow(1.06, combo);
    switch (name) {
      case 'jump': this.osc('square', 300, 600, 0.12, 0.18); break;
      case 'jump2': this.osc('square', 400, 900, 0.1, 0.16); break;
      case 'land': this.noise(0.06, 0.15, 'lowpass', 400); break;
      case 'coin': this.osc('square', 988 * pitch, 988 * pitch, 0.06, 0.12); this.osc('square', 1319 * pitch, 1319 * pitch, 0.07, 0.12, 0.06); break;
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.15, i * 0.07)); break;
      case 'shield': this.noise(0.2, 0.2, 'highpass', 2000); this.osc('sawtooth', 220, 80, 0.25, 0.18); break;
      case 'hit': this.osc('sawtooth', 200, 40, 0.4, 0.25); this.noise(0.15, 0.2, 'lowpass', 900); break;
      case 'die': [330, 262, 220, 165].forEach((f, i) => this.osc('triangle', f, f, 0.14, 0.18, i * 0.15)); break;
      case 'dash': this.noise(0.3, 0.18, 'bandpass', 1800); break;
      case 'shoot': this.osc('square', 900, 500, 0.08, 0.14); break;
      case 'axe': this.noise(0.25, 0.12, 'bandpass', 900); this.osc('square', 300, 500, 0.2, 0.08); break;
      case 'crunch': this.noise(0.1, 0.22, 'lowpass', 600); this.osc('sine', 150, 60, 0.12, 0.2); break;
      case 'tag': this.osc('sine', 500, 1000, 0.12, 0.16); this.osc('sine', 750, 1500, 0.12, 0.1, 0.03); break;
      case 'perfect': [660, 880, 1320].forEach((f, i) => this.osc('sine', f, f, 0.08, 0.14, i * 0.05)); break;
      case 'ui': this.osc('sine', 1200, 1200, 0.05, 0.1); break;
      case 'uiConfirm': this.osc('sine', 900, 900, 0.05, 0.1); this.osc('sine', 1350, 1350, 0.06, 0.1, 0.05); break;
      case 'uiBad': this.osc('square', 200, 150, 0.15, 0.12); break;
      case 'waka': this.osc('square', 500, 300, 0.05, 0.12); this.osc('square', 300, 500, 0.05, 0.12, 0.05); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, f, 0.11, 0.14, i * 0.09)); break;
      case 'lose': [400, 350, 300, 200].forEach((f, i) => this.osc('sawtooth', f, f * 0.9, 0.16, 0.12, i * 0.12)); break;
      case 'checkpoint': this.osc('triangle', 700, 1400, 0.15, 0.14); break;
      case 'boom': this.noise(0.5, 0.3, 'lowpass', 300); this.osc('sine', 100, 30, 0.5, 0.3); break;
      case 'plop': this.osc('sine', 300, 120, 0.15, 0.2); break;
      case 'type': this.osc('square', 800, 800, 0.02, 0.05); break;
    }
  }

  // ---- Music sequencer ------------------------------------------------------
  // Bank: {bpm, bass:[...], lead:[...], hats:[...], kick:[...], snare:[...],
  // clap:[...]} arrays of 32 steps (2 bars of 16ths); melodic values are
  // frequency or null, percussion is boolean. Loops with A/B lead.
  setBank(bank) {
    this.bank = bank;
    this.step = 0; // songs start from the top (section order matters now)
    if (bank && bank.bpm) {
      this.bpm = bank.bpm;
      if (this.delay) this.delay.delayTime.value = Math.min(0.9, (60 / bank.bpm) * 0.75); // dotted 8th
    }
  }

  setDetune(d) { this.detune = d; }

  onBeat(fn) { this.beatListeners.push(fn); }

  startSequencer() {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx || !this.bank) return;
    const spb = (60 / (this.bpm * this.detune)) / 4; // seconds per 16th step
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const s = this.step % 32;
      // Song form: bank.sections is a list of partial banks (lane overrides)
      // and bank.order the 2-bar-block sequence to play them in — so a track
      // can progress verse/lift/bridge instead of looping one 2-bar phrase.
      let b = this.bank;
      if (b.sections && b.sections.length) {
        const order = b.order || b.sections.map((_, i) => i);
        const sec = b.sections[order[Math.floor(this.step / 32) % order.length] % b.sections.length];
        if (sec) b = { ...this.bank, ...sec };
      }
      const play = (freq, type, dur, gain) => {
        if (freq == null) return;
        const t = this.nextTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * this.detune, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + dur + 0.02);
      };
      // Sections may push the echo send harder (e.g. an "echoing chords" payoff).
      if (this.echoSend) this.echoSend.gain.setTargetAtTime(b.echoLevel != null ? b.echoLevel : 0.28, this.nextTime, 0.08);
      if (b.bass) play(b.bass[s], b.bassType || 'square', spb * 1.8, 0.1);
      if (b.lead) play(b.lead[s], b.leadType || 'square', spb * 1.2, 0.06);
      if (b.leadHarm) play(b.leadHarm[s], b.leadType || 'square', spb * 1.2, 0.04); // parallel-3rds partner voice
      if (b.keyGliss && b.keyGliss[s]) {
        // keyboard-sweep glissando: discrete scale notes (a hand dragged up
        // the white keys) running an octave up into the target, cresc. slightly
        const fT = b.keyGliss[s] * this.detune;
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0]; // natural-minor run
        const dt = (spb * 3) / steps.length;
        const gv = b.keyGlissGain != null ? b.keyGlissGain : 0.06;
        steps.forEach((semi, i) => {
          const t = this.nextTime + i * dt;
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = b.leadType || 'square';
          o.frequency.setValueAtTime(fT * Math.pow(2, semi / 12), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv * (0.6 + 0.4 * ((i + 1) / steps.length)), t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dt * 1.7);
          o.connect(g); g.connect(this.musicGain);
          o.start(t); o.stop(t + dt * 1.7 + 0.02);
        });
      }
      if (b.gliss && b.gliss[s]) {
        // glissando: sweep up from an octave below into the target note,
        // with echo taps panned left -> center -> right across the field
        const t = this.nextTime;
        const fT = b.gliss[s] * this.detune;
        const o = this.ctx.createOscillator();
        o.type = b.leadType || 'square';
        o.frequency.setValueAtTime(fT * 0.5, t);
        o.frequency.exponentialRampToValueAtTime(fT, t + spb * 3);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
        g.gain.setValueAtTime(0.05, t + spb * 3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 4);
        o.connect(g); g.connect(this.musicGain);
        const pans = [-0.8, 0.1, 0.8];
        pans.forEach((pv, e) => {
          const d = this.ctx.createDelay(2); d.delayTime.value = spb * 2 * (e + 1);
          const eg = this.ctx.createGain(); eg.gain.value = 0.5 * Math.pow(0.6, e);
          g.connect(d); d.connect(eg);
          if (this.ctx.createStereoPanner) {
            const p = this.ctx.createStereoPanner(); p.pan.value = pv;
            eg.connect(p); p.connect(this.musicGain);
          } else {
            eg.connect(this.musicGain);
          }
        });
        o.start(t); o.stop(t + spb * 4 + 0.02);
      }
      if (b.chords && b.chords[s]) {
        // stab: all chord tones at once, short and punchy
        for (const cf of b.chords[s]) play(cf, b.chordType || 'square', spb * 2.6, 0.05);
      }
      if (b.kick && b.kick[s]) {
        // tight thump: fast pitch drop, short tail — punch without boom
        const t = this.nextTime;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(50, t + 0.06);
        g.gain.setValueAtTime(0.34, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 0.11);
      }
      if (b.hats && b.hats[s]) {
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t); src.stop(t + 0.07);
      }
      if (b.vox && b.vox[s]) {
        // Vocal hit ("hey!"): sawtooth glottal buzz with a falling pitch bend,
        // shaped by two parallel bandpass formants; vowel alternates per slot.
        const t = this.nextTime;
        const f0 = b.vox[s];
        const [fm1, fm2] = (s % 8 < 4) ? [750, 1150] : [600, 2000]; // "ah" / "ay"
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 1.3 * this.detune, t);
        o.frequency.exponentialRampToValueAtTime(f0 * this.detune, t + 0.07);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        const mix = this.ctx.createGain(); mix.gain.value = 0.55;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = fm1; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.frequency.value = fm2; fb2.Q.value = 8;
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(this.musicGain);
        o.start(t); o.stop(t + 0.2);
      }
      if (b.shout && b.shout[s]) {
        // Vocal shout ("yeah!" / "alright!"): sawtooth voice through MOVING
        // formant filters — gliding vowels read as a word, not just a hit.
        const t = this.nextTime;
        const f0 = b.shout[s] * this.detune;
        const word = (Math.floor(this.step / 32) + s) % 2 === 0 ? 'yeah' : 'alright';
        const dur = word === 'yeah' ? 0.32 : 0.46;
        const traj = word === 'yeah'
          ? [[0, 320, 2100], [0.08, 560, 1800], [0.28, 760, 1250]]
          : [[0, 520, 950], [0.16, 700, 1300], [0.22, 640, 1100], [0.3, 720, 1350], [0.44, 400, 2000]];
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        if (word === 'yeah') {
          o.frequency.setValueAtTime(f0 * 1.25, t);
          o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + dur);
        } else {
          o.frequency.setValueAtTime(f0, t);
          o.frequency.setValueAtTime(f0, t + 0.2);
          o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + 0.28); // "al-RIGHT"
          o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
        }
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        if (word === 'alright') {
          env.gain.exponentialRampToValueAtTime(0.2, t + 0.2); // syllable gap
          env.gain.exponentialRampToValueAtTime(0.5, t + 0.26);
        }
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const mix = this.ctx.createGain(); mix.gain.value = b.shoutGain != null ? b.shoutGain : 0.5;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.Q.value = 8;
        fa.frequency.setValueAtTime(traj[0][1], t);
        fb2.frequency.setValueAtTime(traj[0][2], t);
        for (const [tt, F1, F2] of traj.slice(1)) {
          fa.frequency.linearRampToValueAtTime(F1, t + tt);
          fb2.frequency.linearRampToValueAtTime(F2, t + tt);
        }
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(this.musicGain);
        o.start(t); o.stop(t + dur + 0.02);
      }
      if (b.ohats && b.ohats[s]) {
        // open hat: same noise, lower cutoff, long sizzle tail
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t); src.stop(t + 0.24);
      }
      if (b.snare && b.snare[s]) {
        // crisp crack: brighter noise band, short decay, just a hint of body
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.32, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t); src.stop(t + 0.11);
        const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(og); og.connect(this.musicGain); o.start(t); o.stop(t + 0.08);
      }
      if (b.clap && b.clap[s]) {
        // three staggered high-passed bursts read as a clap
        for (let ci = 0; ci < 3; ci++) {
          const t = this.nextTime + ci * 0.012;
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(ci === 2 ? 0.26 : 0.16, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + (ci === 2 ? 0.12 : 0.03));
          src.connect(f); f.connect(g); g.connect(this.musicGain);
          src.start(t); src.stop(t + 0.15);
        }
      }
      if (s % 4 === 0) {
        const beatIdx = Math.floor(this.step / 4);
        const when = this.nextTime;
        for (const fn of this.beatListeners) fn(beatIdx, when);
      }
      this.nextTime += spb;
      this.step++;
    }
  }

  // Beat phase for rhythm cabinet: 0..1 within the current beat.
  beatPhase() {
    if (!this.ctx || !this.bank) return 0;
    const spb = (60 / (this.bpm * this.detune));
    return ((this.ctx.currentTime % spb) / spb);
  }
}

export const Audio = new AudioSys();

// Note helper: n('A2') -> frequency.
const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function n(name) {
  if (name == null) return null;
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return null;
  const semitone = NOTES[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (semitone - 69) / 12);
}
// "A3min7 . . . F3maj7 . . ." -> 32-length array of frequency-arrays (or null).
// Chord names: <note><octave> + maj | min | 7 | maj7 | min7 | 9 (default maj).
const CHORD_IV = {
  maj: [0, 4, 7], min: [0, 3, 7], 7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], 9: [0, 4, 7, 14],
};
export function chordSeq(str) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < 32; i++) {
    const tk = toks[i % toks.length];
    if (tk === '.') { out.push(null); continue; }
    const m = tk.match(/^([A-G]#?\d+)(maj7|min7|maj|min|9|7)?$/);
    if (!m) { out.push(null); continue; }
    const root = n(m[1]);
    const iv = CHORD_IV[m[2] || 'maj'];
    out.push(iv.map((semi) => root * Math.pow(2, semi / 12)));
  }
  return out;
}

export function seq(str) {
  // "A2 . . A2 | C3 . . ." -> 32-length note array (pads/truncates), '.' = rest
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < 32; i++) out.push(n(toks[i % toks.length] === '.' ? null : toks[i % toks.length]));
  return out;
}
