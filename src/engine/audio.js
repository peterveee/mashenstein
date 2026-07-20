// Web Audio: procedural SFX + a lookahead step-sequencer with per-cabinet
// pattern banks. Lazy init on first user gesture; ctx.resume() on every gesture (iOS).

// Layered and harmonically dense cues sum much louder than a single oscillator
// at the same nominal gain. These trims keep their perceived peaks close to the
// everyday jump/coin/UI family while preserving their internal balance.
const SFX_TRIM = {
  blockBreak: 0.58, boom: 0.68, coinSpray: 0.7, hit: 0.74,
  shield: 0.78, star: 0.72, win: 0.76, power: 0.84,
  crunch: 0.84, chomp: 0.84, tag: 0.9, perfect: 0.88,
  // A tail layer, not an event: it should colour the break, never top it.
  debris: 0.65,
  // Miss Chomp's coin bite. Measured against 'coin': it peaks ~5dB hotter at
  // the same nominal gain (the resonant lowpass), but the real problem was
  // sustain — it holds its peak where 'coin' is a fast-decaying blip, putting
  // it ~23dB up on total energy. Trim plus a shorter hold (see the cue) lands
  // it just under 'coin' on peak and a few dB over on energy.
  waka: 0.45,
};

// Timbres for the 'debris' cue — what the chunks sound like hitting the floor.
// Exported so the obstacle table's `mat` values can be checked against it.
export const DEBRIS_MATS = {
  wood:  { type: 'bandpass', freq: 1100, gain: 0.10, ticks: 4, dur: 0.045 },
  stone: { type: 'bandpass', freq: 2300, gain: 0.09, ticks: 4, dur: 0.03 },
  metal: { type: 'highpass', freq: 3800, gain: 0.07, ticks: 3, dur: 0.035, ping: [1860, 2490] },
  soft:  { type: 'lowpass',  freq: 520,  gain: 0.11, ticks: 3, dur: 0.06 },
  // The ?-box: a light tinkle that sits *under* the coinSpray already firing
  // over it, rather than competing with it for the same ear.
  gold:  { type: 'highpass', freq: 5200, gain: 0.05, ticks: 3, dur: 0.025, ping: [2637, 3136] },
};

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null; this.sfxGain = null; this.musicGain = null;
    this.muted = false;
    this.levels = { master: 1, music: 0.7, sfx: 0.9 };
    this.cueGain = 1;
    this.noiseBuf = null;
    // sequencer
    this.bpm = 112;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.bank = null;      // current pattern bank
    this.tempo = 1;        // song speed multiplier (slow-mo drags it down)
    this.detune = 1;       // song pitch multiplier
    this.starMode = false; // invincibility layer on/off
    this.starRoot = 110;   // last bass note the song played (arpeggio follows it)
    this.beatListeners = [];
    this.songTime = 0;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Some engines create a suspended context even when autoplay is allowed,
    // and require an explicit resume request. Try immediately; browsers with
    // a gesture requirement reject/hold it harmlessly, then the existing
    // gesture path calls ensure() again and resumes for real.
    if (this.ctx.state === 'suspended') {
      const resumed = this.ctx.resume();
      if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.levels.master;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.levels.sfx; this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.levels.music; this.musicGain.connect(this.master);
    // The song proper rides on musicBus; the invincibility arpeggio rides on
    // starBus. Two buses so the theme can duck under the star layer without
    // the star layer ducking itself. Both feed musicGain (and so the echo).
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(this.musicGain);
    this.starBus = this.ctx.createGain(); this.starBus.gain.value = 0; this.starBus.connect(this.musicGain);
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
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.levels.master, this.ctx.currentTime, 0.02);
  }

  setVolumes(volumes = {}) {
    for (const key of ['master', 'music', 'sfx']) {
      if (Number.isFinite(volumes[key])) this.levels[key] = Math.max(0, Math.min(1, volumes[key]));
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.levels.master, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.levels.music, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.levels.sfx, t, 0.02);
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
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
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
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // The title sign shorting out.
  //
  // Runs on the SFX bus, NOT the music bus, and that routing is the whole point
  // of where it sits: the echo send is fed from musicGain, so anything on the
  // music bus is echoed whether it wants to be or not. A buzzing sign is a
  // physical object a few feet away, not something ringing around the arcade,
  // so it has to bypass that send entirely. sfxGain connects straight to master.
  //
  // Three things make this read as a BUZZ rather than the thud it used to be:
  // it lasts long enough to hear (a 0.1s blip is a click, the ear needs a few
  // cycles of stutter to call something a buzz); the tone keeps its harmonics
  // instead of being lowpassed down to a bare sine; and the whole thing is
  // chopped by a stutter gate, which is the actual sound of a contact
  // chattering rather than a tube humming.
  //
  // Level: deliberately way down at the threshold of hearing. This is a room
  // detail — the sign you only notice once you have stopped reading the menu —
  // not a cue, and it repeats forever on the title screen, so anything that
  // announces itself becomes a tic. Scale the whole thing from `q` rather than
  // editing four envelope points to change how loud it is.
  //
  // Unlike osc()/noise(), this authors its own nodes, so it has to apply
  // cueGain itself or an SFX_TRIM entry for it would silently do nothing.
  neonBuzz() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const DUR = 0.34;
    const q = this.cueGain * 0.4;   // master level for the whole buzz

    // The stutter gate everything runs through: the contact chattering, slowing
    // down as the arc gives up. Multiplies rather than replaces the envelopes,
    // so the buzz and its crackle break up together.
    const gate = this.ctx.createGain(); gate.gain.value = 0.6;
    const lfo = this.ctx.createOscillator(); lfo.type = 'square';
    lfo.frequency.setValueAtTime(46, t);
    lfo.frequency.linearRampToValueAtTime(29, t + DUR);
    const lfoDepth = this.ctx.createGain(); lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth); lfoDepth.connect(gate.gain);
    gate.connect(this.sfxGain);

    // Pitched up near the sixth harmonic of mains: the low version sat in the
    // theme's bass and read as a thump, and even at the third it still had body.
    // A tiny failing tube sings high and thin, so it can sit quietly on top of
    // the music instead of competing with it.
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(720, t);
    o.frequency.linearRampToValueAtTime(676, t + DUR);   // sags as it dies
    // A detuned partial roughly an octave up beats against the fundamental,
    // which is what sours a clean hum into a rasp.
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(1455, t);
    const o2g = this.ctx.createGain(); o2g.gain.value = 0.24;
    // Highpassed as well as lowpassed now: with the fundamental this high, what
    // little bottom the saw has left is all thump and no sizzle.
    const ohp = this.ctx.createBiquadFilter(); ohp.type = 'highpass';
    ohp.frequency.value = 520;
    const of = this.ctx.createBiquadFilter(); of.type = 'lowpass';
    of.frequency.value = 5200; of.Q.value = 0.9;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.006 * q, t + 0.014);
    og.gain.exponentialRampToValueAtTime(0.0034 * q, t + 0.16);
    og.gain.exponentialRampToValueAtTime(0.0001, t + DUR);
    o.connect(ohp); o2.connect(o2g); o2g.connect(ohp);
    ohp.connect(of); of.connect(og); og.connect(gate);
    o.start(t); o.stop(t + DUR + 0.02);
    o2.start(t); o2.stop(t + DUR + 0.02);
    lfo.start(t); lfo.stop(t + DUR + 0.02);

    // The arc itself: a thin band of noise up where the spark lives, riding on
    // through the buzz rather than snapping shut after one frame.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 4600; nf.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.003 * q, t + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0009 * q, t + 0.13);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + DUR * 0.85);
    src.connect(nf); nf.connect(ng); ng.connect(gate);
    src.start(t); src.stop(t + DUR);
  }

  // A breathy shooting-star gesture routed through the music bus, so it sits
  // inside the title theme's echo and volume rather than behaving like an SFX.
  cometSwoop() {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(920, t + 0.52);
    o.frequency.exponentialRampToValueAtTime(610, t + 1.25);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.026, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.013, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(f); f.connect(g);
    if (this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.65, t); pan.pan.linearRampToValueAtTime(0.55, t + 1.2);
      g.connect(pan); pan.connect(this.musicBus);
    } else g.connect(this.musicBus);
    o.start(t); o.stop(t + 1.34);
  }

  // A jump you can actually hear rising: one square wave gliding up over two
  // and a half octaves, with the envelope HELD through the climb so the sweep
  // is still loud when it reaches the top. A plain decaying osc() swallows the
  // top of the glide, which is what made the old one feel flat.
  jumpTone(when = 0, pitch = 1, gain = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.17;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    // A bare square puts harmonics at 3.4k/5.7k by the top of the sweep —
    // right where the ear is most sensitive — so this read as louder than
    // cues sitting at the same gain. Roll them off instead of only pulling
    // the level down. Non-resonant, so the shape of the sweep is untouched.
    f.type = 'lowpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(2200 * pitch, t);
    o.frequency.setValueAtTime(200 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1150 * pitch, t + dur * 0.82);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.setValueAtTime(peak, t + dur * 0.45); // shorter hold: a blip, not a blast
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // One PAC-style bite: pitch and filter glide down as the mouth closes and
  // back up as it opens. The glide is what makes it read as "waka" rather
  // than a beep — a square through a resonant lowpass keeps the mouthy timbre.
  // `hold` is the fraction of the note spent at full level before the release.
  // The coin bite uses a shorter one than the hazard chomp: it fires on every
  // pickup, and it's the sustain — not the peak — that made it wearing.
  waka(when = 0, pitch = 1, gain = 0.13, hold = 0.75) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.12;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    f.type = 'lowpass';
    f.Q.value = 6;
    o.frequency.setValueAtTime(1000 * pitch, t);
    o.frequency.linearRampToValueAtTime(280 * pitch, t + dur * 0.5);
    o.frequency.linearRampToValueAtTime(940 * pitch, t + dur);
    f.frequency.setValueAtTime(2600 * pitch, t);
    f.frequency.linearRampToValueAtTime(700 * pitch, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(2400 * pitch, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.setValueAtTime(peak, t + dur * hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  sfx(name, opt = {}) {
    if (!this.ctx) return;
    this.cueGain = SFX_TRIM[name] ?? 1;
    const combo = opt.combo || 0;
    const pitch = Math.pow(1.06, combo);
    switch (name) {
      // Quieter than 'coin' on purpose: it's a square wave (loud for its
      // amplitude) and it fires more often than any other cue in the game.
      case 'jump': this.jumpTone(0, 1, 0.055); break;
      case 'jump2': this.jumpTone(0, 1.5, 0.045); break; // double jump: same shape, a fifth up
      case 'land': this.noise(0.06, 0.15, 'lowpass', 400); break;
      case 'coin': this.osc('square', 988 * pitch, 988 * pitch, 0.06, 0.12); this.osc('square', 1319 * pitch, 1319 * pitch, 0.07, 0.12, 0.06); break;
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.15, i * 0.07)); break;
      case 'shield': this.noise(0.2, 0.2, 'highpass', 2000); this.osc('sawtooth', 220, 80, 0.25, 0.18); break;
      // Invincibility on: a fast rising run that lands on an octave shimmer.
      case 'star': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.osc('square', f, f, 0.07, 0.13, i * 0.045)); break;
      // ...and off: the same run walking back down, quieter.
      case 'starEnd': [1568, 1319, 1047, 784].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.1, i * 0.06)); break;
      case 'hit': this.osc('sawtooth', 200, 40, 0.4, 0.25); this.noise(0.15, 0.2, 'lowpass', 900); break;
      case 'die': [330, 262, 220, 165].forEach((f, i) => this.osc('triangle', f, f, 0.14, 0.18, i * 0.15)); break;
      case 'dash': this.noise(0.3, 0.18, 'bandpass', 1800); break;
      case 'shoot': this.osc('square', 900, 500, 0.08, 0.14); break;
      case 'axe': this.noise(0.25, 0.12, 'bandpass', 900); this.osc('square', 300, 500, 0.2, 0.08); break;
      case 'crunch': this.noise(0.1, 0.22, 'lowpass', 600); this.osc('sine', 150, 60, 0.12, 0.2); break;
      // The chunks landing, a beat after the thing came apart. Deliberately a
      // separate cue from the break itself: it starts ~0.1s late (roughly the
      // shards' flight time) and thins out, so a break reads as impact-then-
      // scatter instead of one flat noise burst. Material picks the timbre.
      case 'debris': {
        const m = DEBRIS_MATS[opt.mat] || DEBRIS_MATS.wood;
        for (let i = 0; i < m.ticks; i++) {
          // uneven spacing — evenly spaced ticks read as a machine, not rubble
          const when = 0.1 + i * 0.062 + (i % 2) * 0.021;
          this.noise(m.dur, m.gain * (1 - i * 0.22), m.type, m.freq * (1 - i * 0.12), when);
        }
        if (m.ping) m.ping.forEach((f, i) => this.osc('triangle', f, f * 0.94, 0.07, 0.035, 0.12 + i * 0.08));
        break;
      }
      // A ?-box giving way overhead: a hard ceramic crack on top of a gut
      // thump, then splinters raining down. 'crunch' was too polite for a hit
      // you are meant to go out of your way to land.
      case 'blockBreak':
        this.noise(0.05, 0.34, 'highpass', 3200);        // the crack
        this.noise(0.22, 0.26, 'bandpass', 950);         // the body letting go
        this.osc('sine', 190, 45, 0.2, 0.32);            // thump
        this.osc('square', 620, 300, 0.09, 0.12, 0.01);  // splintering edge
        [0.07, 0.13, 0.19].forEach((d, i) => this.noise(0.05, 0.11 - i * 0.03, 'bandpass', 2400 - i * 500, d));
        break;
      // Coins spilling out of it: one blip per coin, staggered and climbing,
      // with a shimmer over the top so a big payout sounds like a big payout.
      case 'coinSpray': {
        const nCoins = Math.max(1, Math.min(10, opt.count || 3));
        for (let i = 0; i < nCoins; i++) {
          const p = Math.pow(1.07, i);
          const when = 0.045 + i * 0.055;
          const g = 0.13 - i * 0.006;
          this.osc('square', 988 * p, 988 * p, 0.05, g, when);
          this.osc('square', 1319 * p, 1319 * p, 0.07, g, when + 0.045);
        }
        this.noise(0.3, 0.06, 'highpass', 6500, 0.05);
        break;
      }
      case 'tag': this.osc('sine', 500, 1000, 0.12, 0.16); this.osc('sine', 750, 1500, 0.12, 0.1, 0.03); break;
      case 'perfect': [660, 880, 1320].forEach((f, i) => this.osc('sine', f, f, 0.08, 0.14, i * 0.05)); break;
      case 'ui': this.osc('sine', 1200, 1200, 0.05, 0.1); break;
      case 'uiConfirm': this.osc('sine', 900, 900, 0.05, 0.1); this.osc('sine', 1350, 1350, 0.06, 0.1, 0.05); break;
      case 'uiBad': this.osc('square', 200, 150, 0.15, 0.12); break;
      // One bite per coin, exactly like eating dots; combos ride the pitch up.
      case 'waka': this.waka(0, pitch, 0.13, 0.4); break;
      // The hazard bite gets the full waka-waka plus something giving way.
      case 'chomp':
        this.waka(0, 0.92, 0.15);
        this.waka(0.135, 0.84, 0.15);
        this.noise(0.06, 0.10, 'lowpass', 520, 0.25);
        break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, f, 0.11, 0.14, i * 0.09)); break;
      case 'lose': [400, 350, 300, 200].forEach((f, i) => this.osc('sawtooth', f, f * 0.9, 0.16, 0.12, i * 0.12)); break;
      case 'checkpoint': this.osc('triangle', 700, 1400, 0.15, 0.14); break;
      case 'boom': this.noise(0.5, 0.3, 'lowpass', 300); this.osc('sine', 100, 30, 0.5, 0.3); break;
      case 'plop': this.osc('sine', 300, 120, 0.15, 0.2); break;
      case 'type': this.osc('square', 800, 800, 0.02, 0.05); break;
      case 'comet': this.cometSwoop(); break;
      case 'neonBuzz': this.neonBuzz(); break;
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

  // Tempo and pitch warp independently: slow-mo drags the tempo without
  // dropping the key, invincibility winds both up a whole tone.
  setWarp(tempo, pitch = tempo) { this.tempo = tempo; this.detune = pitch; }
  setDetune(d) { this.setWarp(d, d); }

  // Invincibility: duck the theme and bring up the star arpeggio over it, so
  // it still reads as the same song — just electrified.
  setInvincible(on) {
    on = !!on;
    if (on === this.starMode) return;
    this.starMode = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? 0.32 : 1, t, 0.08);
    this.starBus.gain.setTargetAtTime(on ? 1.5 : 0, t, 0.08);
  }

  onBeat(fn) { this.beatListeners.push(fn); }

  startSequencer() {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx || !this.bank) return;
    const spb = (60 / (this.bpm * this.tempo)) / 4; // seconds per 16th step
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
      const play = (freq, type, dur, gain, attack = 0.01) => {
        if (freq == null) return;
        const t = this.nextTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * this.detune, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + Math.min(attack, dur * 0.45));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.musicBus);
        o.start(t); o.stop(t + dur + 0.02);
      };
      // Sections may push the echo send harder (e.g. an "echoing chords" payoff).
      if (this.echoSend) this.echoSend.gain.setTargetAtTime(b.echoLevel != null ? b.echoLevel : 0.28, this.nextTime, 0.08);
      if (b.bass) {
        play(b.bass[s], b.bassType || 'square', spb * (b.bassDur || 1.8), b.bassGain ?? 0.1, b.bassAttack || 0.01);
        if (b.bass[s] != null) this.starRoot = b.bass[s]; // the star arpeggio follows the song's key
      }
      if (b.lead) play(b.lead[s], b.leadType || 'square', spb * (b.leadDur || 1.2), b.leadGain ?? 0.06, b.leadAttack || 0.01);
      if (b.leadHarm) play(b.leadHarm[s], b.harmType || b.leadType || 'square', spb * (b.harmDur || b.leadDur || 1.2), b.harmGain ?? 0.04, b.harmAttack || b.leadAttack || 0.01); // parallel-3rds partner voice
      if (b.twinkle && b.twinkle[s]) {
        play(b.twinkle[s], 'sine', spb * (b.twinkleDur || 6), b.twinkleGain ?? 0.014, b.twinkleAttack || 0.035);
        play(b.twinkle[s] * 2, 'sine', spb * (b.twinkleDur || 6) * 0.65, (b.twinkleGain ?? 0.014) * 0.28, 0.02);
      }
      if (b.sweeps && b.sweeps[s] && this.noiseBuf) {
        // Heavily filtered air: a narrow band slowly opens and closes beneath
        // a low-pass ceiling. It should be felt as motion, not heard as hiss.
        const t = this.nextTime;
        const dur = spb * (b.sweepDur || 10);
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        const band = this.ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 1.45;
        band.frequency.setValueAtTime(340, t);
        band.frequency.exponentialRampToValueAtTime(1350, t + dur * 0.55);
        band.frequency.exponentialRampToValueAtTime(460, t + dur);
        const low = this.ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 1800; low.Q.value = 0.5;
        const g = this.ctx.createGain();
        const gain = b.sweepGain ?? 0.022;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(band); band.connect(low); low.connect(g);
        if (this.ctx.createStereoPanner) {
          const pan = this.ctx.createStereoPanner();
          const from = s % 2 ? 0.35 : -0.35;
          pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(-from, t + dur);
          g.connect(pan); pan.connect(this.musicBus);
        } else g.connect(this.musicBus);
        src.start(t); src.stop(t + dur + 0.03);
      }
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
          o.connect(g); g.connect(this.musicBus);
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
        o.connect(g); g.connect(this.musicBus);
        const pans = [-0.8, 0.1, 0.8];
        pans.forEach((pv, e) => {
          const d = this.ctx.createDelay(2); d.delayTime.value = spb * 2 * (e + 1);
          const eg = this.ctx.createGain(); eg.gain.value = 0.5 * Math.pow(0.6, e);
          g.connect(d); d.connect(eg);
          if (this.ctx.createStereoPanner) {
            const p = this.ctx.createStereoPanner(); p.pan.value = pv;
            eg.connect(p); p.connect(this.musicBus);
          } else {
            eg.connect(this.musicBus);
          }
        });
        o.start(t); o.stop(t + spb * 4 + 0.02);
      }
      if (b.chords && b.chords[s]) {
        // stab: all chord tones at once, short and punchy
        for (const cf of b.chords[s]) play(cf, b.chordType || 'square', spb * (b.chordDur || 2.6), b.chordGain ?? 0.05, b.chordAttack || 0.01);
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
        o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.11);
      }
      if (b.hats && b.hats[s]) {
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(this.musicBus);
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
        fa.connect(mix); fb2.connect(mix); mix.connect(this.musicBus);
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
        fa.connect(mix); fb2.connect(mix); mix.connect(this.musicBus);
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
        src.connect(f); f.connect(g); g.connect(this.musicBus);
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
        src.connect(f); f.connect(g); g.connect(this.musicBus);
        src.start(t); src.stop(t + 0.11);
        const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(og); og.connect(this.musicBus); o.start(t); o.stop(t + 0.08);
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
          src.connect(f); f.connect(g); g.connect(this.musicBus);
          src.start(t); src.stop(t + 0.15);
        }
      }
      // Invincibility layer: a relentless 16th-note arpeggio over the ducked
      // theme, plus a ride tick on the offbeats. The notes are root/fifth/
      // octave/twelfth off whatever bass note the song last played, so it sits
      // in key over any cabinet's bank instead of needing a fixed-key bank.
      if (this.starMode && this.starBus) {
        const t = this.nextTime;
        const ratios = [1, 1.5, 2, 3];
        const f = this.starRoot * 4 * ratios[s % ratios.length] * this.detune;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t);
        const peak = s % 4 === 0 ? 0.14 : 0.09; // accent the downbeat of each group
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.9);
        o.connect(g); g.connect(this.starBus);
        o.start(t); o.stop(t + spb + 0.02);
        if (s % 2 === 1) {
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const hf = this.ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000;
          const hg = this.ctx.createGain();
          hg.gain.setValueAtTime(0.11, t);
          hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          src.connect(hf); hf.connect(hg); hg.connect(this.starBus);
          src.start(t); src.stop(t + 0.06);
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

  // Fractional beat position of what is being HEARD right now, counted from
  // the top of the bank (setBank resets step to 0, so beat 0 is the downbeat).
  // The sequencer schedules ahead of the playhead, so `step` is the future —
  // back it off by the outstanding lookahead or visuals sync to notes that
  // have not sounded yet. Returns null when there is no song to lock to, so
  // callers can fall back to a wall clock.
  songBeat() {
    if (!this.ctx || !this.bank) return null;
    const spb = (60 / (this.bpm * this.tempo)) / 4;
    const ahead = (this.nextTime - this.ctx.currentTime) / spb;
    return (this.step - ahead) / 4;
  }

  // Beat phase for rhythm cabinet: 0..1 within the current beat.
  beatPhase() {
    if (!this.ctx || !this.bank) return 0;
    const spb = (60 / (this.bpm * this.tempo));
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
