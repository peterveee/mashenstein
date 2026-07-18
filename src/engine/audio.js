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
  // Bank: {bpm, bass:[...], lead:[...], hats:[...], kick:[...]} arrays of
  // 32 steps (2 bars of 16ths), values = frequency or null. Loops with A/B lead.
  setBank(bank) {
    this.bank = bank;
    if (bank && bank.bpm) this.bpm = bank.bpm;
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
      const b = this.bank;
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
      if (b.bass) play(b.bass[s], b.bassType || 'square', spb * 1.8, 0.1);
      if (b.lead) play(b.lead[s], b.leadType || 'square', spb * 1.2, 0.06);
      if (b.kick && b.kick[s]) {
        const t = this.nextTime;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 0.15);
      }
      if (b.hats && b.hats[s]) {
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t); src.stop(t + 0.05);
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
export function seq(str) {
  // "A2 . . A2 | C3 . . ." -> 32-length note array (pads/truncates), '.' = rest
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < 32; i++) out.push(n(toks[i % toks.length] === '.' ? null : toks[i % toks.length]));
  return out;
}
