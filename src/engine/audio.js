// Web Audio: procedural SFX + a lookahead step-sequencer with per-cabinet
// pattern banks. Lazy init on first user gesture; ctx.resume() on every gesture (iOS).

// Layered and harmonically dense cues sum much louder than a single oscillator
// at the same nominal gain. These trims keep their perceived peaks close to the
// everyday jump/coin/UI family while preserving their internal balance.
const SFX_TRIM = {
  blockBreak: 0.58, coinSpray: 0.7, hit: 0.74, impact: 1.08,
  contact: 1, launch: 0.92,
  shield: 0.78, star: 0.72, win: 0.76, power: 0.84,
  crunch: 0.84, chomp: 0.84, tag: 0.9, perfect: 0.88,
  // A tail layer, not an event: it should colour the break, never top it.
  debris: 0.65,
  // Fireworks. These layer UNDER 'ui' and 'coin' rather than replacing them,
  // so they are the body of the sound while those two carry the tone. First
  // pass was mixed as background texture and read as too faint.
  fizzUp: 0.75, popSmall: 0.95, popBig: 0.9, crackle: 0.85,
  // The title asteroid's blast needs room for the music: heavy underneath,
  // but not a peak that dominates the menu.
  boom: 0.36,
  // Miss Chomp's coin bite. Measured against 'coin': it peaks ~5dB hotter at
  // the same nominal gain (the resonant lowpass), but the real problem was
  // sustain — it holds its peak where 'coin' is a fast-decaying blip, putting
  // it ~23dB up on total energy. Trim plus a shorter hold (see the cue) lands
  // it just under 'coin' on peak and a few dB over on energy.
  waka: 0.45,
};

// Keep these as files rather than bundling them into game.js so the iPhone
// gate does not download game audio before it has allowed the game to load.
export const CONTACT_AUDIO = {
  b33p: 'audio/weapon-candidates/25-contact-b33p-orb-pop.wav',
  grumpos: 'audio/weapon-candidates/26-contact-grumpos-axe-chop.wav',
  lorenzo: 'audio/weapon-candidates/27-contact-lorenzo-wrench-hit.wav',
  raymn: 'audio/weapon-candidates/28-contact-raymn-fist-impact.wav',
  fernwick: 'audio/weapon-candidates/29-contact-fernwick-shield-bonk.wav',
  chompo: 'audio/weapon-candidates/30-contact-miss-chomp-crunch.wav',
};

export const LAUNCH_AUDIO = {
  b33p: 'audio/weapon-candidates/01-b33p-laser-orb-pulse.wav',
  raymn: 'audio/weapon-candidates/08-raymn-rocket-fist-launch.wav',
  grumpos: 'audio/weapon-candidates/18-grumpos-axe-throw-ring.wav',
};

// The WAVs share a peak ceiling, but their timbres have different perceived
// loudness. These restrained trims bring the family together without boosting
// any cue above its authored level.
const WEAPON_AUDIO_GAIN = {
  contact: { b33p: 0.92, grumpos: 0.94, lorenzo: 0.95, raymn: 0.76, fernwick: 0.98, chompo: 0.9 },
  launch: { b33p: 0.95, raymn: 0.95, grumpos: 0.82 },
};

// Timbres for the 'debris' cue — what the chunks sound like hitting the floor.
// Exported so the obstacle table's `mat` values can be checked against it.
export const DEBRIS_MATS = {
  wood:  { type: 'bandpass', freq: 1100, gain: 0.10, ticks: 4, dur: 0.045 },
  stone: { type: 'bandpass', freq: 2300, gain: 0.09, ticks: 4, dur: 0.03 },
  metal: { type: 'highpass', freq: 3800, gain: 0.07, ticks: 3, dur: 0.035, ping: [1860, 2490] },
  soft:  { type: 'lowpass',  freq: 520,  gain: 0.11, ticks: 3, dur: 0.06 },
  // The !-box: a light tinkle that sits *under* the coinSpray already firing
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
    this.contactBuffers = {};
    this.contactLoad = null;
    this.launchBuffers = {};
    this.launchLoad = null;
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
    this.lifecyclePaused = false;
  }

  ensure() {
    if (this.ctx) {
      if (!this.lifecyclePaused && this.ctx.state !== 'running') this.resumeContext();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Some engines create a suspended context even when autoplay is allowed,
    // and require an explicit resume request. Try immediately; browsers with
    // a gesture requirement reject/hold it harmlessly, then the existing
    // gesture path calls ensure() again and resumes for real.
    if (!this.lifecyclePaused && this.ctx.state === 'suspended') {
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
    // YMCK-style space: tempo-synced dotted-eighth echo. echoBus is a parallel
    // wet send — only melodic lanes (bass/lead/leadHarm/twinkle/chords, via
    // play()'s echo flag) route into it, so percussion and vocal one-shots
    // (kick/hats/snare/clap/vox/shout) stay dry regardless of echoLevel,
    // instead of relying on the highpass below to filter them out after the
    // fact (it doesn't — clap/vox sit well above 500Hz and used to leak
    // through). The highpass still keeps stray low end from muddying repeats.
    //
    // Gain staging: the send used to tap musicGain (post-fader), so echo was
    // implicitly scaled by the music volume. echoBus taps the lane gains
    // pre-fader instead, so the return runs back through musicGain rather
    // than straight to master — same net level as before, and the echo still
    // follows the music volume setting. (No cycle: musicGain doesn't feed
    // echoBus.)
    this.echoBus = this.ctx.createGain(); this.echoBus.gain.value = 1;
    this.echoSend = this.ctx.createGain(); this.echoSend.gain.value = 0.28;
    this.echoHp = this.ctx.createBiquadFilter(); this.echoHp.type = 'highpass'; this.echoHp.frequency.value = 500;
    this.delay = this.ctx.createDelay(1.0); this.delay.delayTime.value = 0.32;
    this.delayLp = this.ctx.createBiquadFilter(); this.delayLp.type = 'lowpass'; this.delayLp.frequency.value = 2800;
    this.delayFb = this.ctx.createGain(); this.delayFb.gain.value = 0.35;
    this.echoBus.connect(this.echoSend);
    this.echoSend.connect(this.echoHp);
    this.echoHp.connect(this.delay);
    this.delay.connect(this.delayLp);
    this.delayLp.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayLp.connect(this.musicGain);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Crashes outlast the 0.5s one-shot buffer, and looping it drops a seam
    // partway through the hit — an audible bump at a fixed 0.5s offset that
    // has nothing to do with the tempo, so it reads as out of time. A longer
    // dedicated buffer lets a crash play straight through, seam-free.
    const clen = Math.floor(this.ctx.sampleRate * 2.5);
    this.crashBuf = this.ctx.createBuffer(1, clen, this.ctx.sampleRate);
    const cd = this.crashBuf.getChannelData(0);
    for (let i = 0; i < clen; i++) cd[i] = Math.random() * 2 - 1;
    this.loadContactAudio();
    this.loadLaunchAudio();
    this.startSequencer();
    if (this.lifecyclePaused && this.ctx.state === 'running') this.suspendContext();
  }

  settleContext(promise) {
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  suspendContext() {
    if (!this.ctx || typeof this.ctx.suspend !== 'function' || this.ctx.state === 'suspended') return;
    try { this.settleContext(this.ctx.suspend()); } catch (e) { /* platform owns lifecycle */ }
  }

  resumeContext() {
    if (!this.ctx || typeof this.ctx.resume !== 'function' || this.lifecyclePaused) return;
    try { this.settleContext(this.ctx.resume()); } catch (e) { /* next gesture retries */ }
  }

  setLifecyclePaused(paused) {
    paused = !!paused;
    if (paused === this.lifecyclePaused) return;
    this.lifecyclePaused = paused;
    if (paused) this.suspendContext();
    else this.resumeContext();
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

  loadContactAudio() {
    this.contactLoad = this.loadAudioSet(CONTACT_AUDIO, this.contactBuffers, 'contact', this.contactLoad);
  }

  loadLaunchAudio() {
    this.launchLoad = this.loadAudioSet(LAUNCH_AUDIO, this.launchBuffers, 'launch', this.launchLoad);
  }

  loadAudioSet(files, buffers, label, pending) {
    if (pending || !this.ctx || typeof fetch !== 'function') return pending;
    return Promise.all(Object.entries(files).map(async ([id, path]) => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        buffers[id] = await this.ctx.decodeAudioData(data);
      } catch (err) {
        // A loose/dev build can still play the procedural impact if an asset
        // is unavailable or a cache refuses one of the files.
        console.warn(`${label} audio unavailable for ${id}; using procedural fallback.`, err);
      }
    }));
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

  explosion() {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;
    // Use the dedicated long noise buffer so the blast has a continuous body,
    // rather than looping the short SFX buffer and sounding like a snare roll.
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(7200, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + 1.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36 * q, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.17 * q, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.08 * q, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    // A quiet send into the arcade echo makes the blast occupy the room, while
    // the dry SFX path stays restrained enough not to jump over the title music.
    const echo = this.ctx.createGain(); echo.gain.value = 0.14;
    g.connect(echo); echo.connect(this.echoBus);
    src.start(t); src.stop(t + 1.55);

    // The front edge is bright and sharp; the long filtered buffer carries the
    // expanding cloud while these layers provide the punch and falling rumble.
    this.noise(0.16, 0.26, 'highpass', 2400);
    this.osc('sine', 125, 22, 1.4, 0.42, 0.02);
    this.osc('triangle', 68, 26, 1.2, 0.25, 0.05);
    this.noise(1.05, 0.14, 'lowpass', 240, 0.04);
    for (const [when, freq, gain] of [[0.18, 1800, 0.13], [0.38, 1250, 0.1], [0.64, 820, 0.075], [0.91, 520, 0.05]]) {
      this.noise(0.16, gain, 'bandpass', freq, when);
    }
  }

  // A compact impact crash. This uses the long noise buffer rather than a
  // handful of tiny filtered pings, so the sound has an audible noisy body and
  // a real tail instead of collapsing into a pitched bonk.
  impactCrash(pitch = 1) {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6200 * pitch, t);
    lp.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.62);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.62 * this.cueGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.28 * this.cueGain, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.78);

    // The noise is the body; these two layers make its front edge read on
    // laptop speakers without turning the whole cue back into a beep.
    this.noise(0.045, 0.46, 'highpass', 3600 * pitch);
    this.osc('sine', 145 * pitch, 38 * pitch, 0.3, 0.34);
  }

  playContact(hero, pitch = 1) {
    const buffer = this.contactBuffers[hero];
    if (!buffer) { this.impactCrash(pitch); return; }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.contact[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  playLaunch(hero, pitch = 1) {
    const buffer = this.launchBuffers[hero];
    if (!buffer) {
      if (hero === 'b33p') this.sfx('shoot', { pitch });
      else if (hero === 'raymn') this.sfx('plop', { pitch });
      else if (hero === 'grumpos') this.sfx('axe', { pitch });
      return;
    }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.launch[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
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
    // opt.pitch is the direct form, for cues that want spread rather than a
    // combo ladder — the fireworks detune every shot so no two bursts twin.
    const pitch = opt.pitch ?? Math.pow(1.06, combo);
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
      // Shared attack contact: a noisy crash, not a pitched little bonk. The
      // wide noise layers carry on small speakers; the low layer gives it the
      // physical hit; the bright transient makes the contact unmistakable.
      // This is separate from 'crunch' (a prop breaking) and 'hit' (the player
      // taking damage), so weapon contact reads before the target reacts.
      case 'impact':
        this.impactCrash(pitch);
        break;
      case 'contact': this.playContact(opt.hero, pitch); break;
      case 'launch': this.playLaunch(opt.hero, pitch); break;
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
      // A !-box giving way overhead: a hard ceramic crack on top of a gut
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
      case 'boom': this.explosion(); break;
      // ---- Fireworks. Three burst shapes so a long results screen never
      // repeats the same crack twice in a row; the caller also detunes each.
      // The mortar going up: air, not tone. Rising sine underneath it only to
      // give the ear something to track to the top of the arc.
      case 'fizzUp':
        this.noise(0.3, 0.09, 'bandpass', 1500);
        this.osc('sine', 260 * pitch, 880 * pitch, 0.3, 0.045);
        break;
      case 'popSmall':
        this.noise(0.09, 0.22, 'highpass', 2200);
        this.osc('triangle', 820 * pitch, 190 * pitch, 0.1, 0.09);
        break;
      case 'popBig':
        this.noise(0.32, 0.24, 'lowpass', 760);
        this.osc('sine', 190 * pitch, 48 * pitch, 0.3, 0.15);
        break;
      // The one with a tail: a crack, then glitter falling out of it.
      case 'crackle':
        this.noise(0.08, 0.2, 'highpass', 1800);
        for (let i = 1; i < 6; i++) this.noise(0.04, 0.1, 'highpass', 3200, 0.05 + i * 0.055);
        break;
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
    // Re-selecting the current bank is common when returning to a menu. Keep
    // its phase intact; only a real bank change should restart the sequencer.
    if (this.bank === bank) return;
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
      const play = (freq, type, dur, gain, attack = 0.01, echo = true, delay = 0) => {
        if (freq == null) return;
        const t = this.nextTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * this.detune, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + Math.min(attack, dur * 0.45));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.musicBus);
        if (echo) g.connect(this.echoBus);
        o.start(t); o.stop(t + dur + 0.02);
      };
      // Sections may push the echo send harder (e.g. an "echoing chords" payoff).
      if (this.echoSend) this.echoSend.gain.setTargetAtTime(b.echoLevel != null ? b.echoLevel : 0.28, this.nextTime, 0.08);
      if (b.bass) {
        // Dry by default (the highpass strips most bass fundamentals anyway,
        // so echo there is usually just wasted CPU) — a bank can opt in with
        // bassEcho: true to catch the sawtooth/square harmonics in the echo,
        // or echoEverything: true to send every lane (percussion included).
        const bassDur = spb * (b.bassDur || 1.8);
        const bassGain = b.bassGain ?? 0.1;
        const bassEcho = !!b.bassEcho || !!b.echoEverything;
        play(b.bass[s], b.bassType || 'square', bassDur, bassGain, b.bassAttack || 0.01, bassEcho);
        // bassRepeat: one softer restatement of the note N steps later — a
        // written-in slapback, not a delay tap, so it has no feedback tail and
        // stays locked to the grid. Always dry: echoing a ghost note doubles it.
        if (b.bassRepeat) {
          play(b.bass[s], b.bassType || 'square', bassDur * (b.bassRepeatDur ?? 0.8),
            bassGain * (b.bassRepeatGain ?? 0.4), b.bassAttack || 0.01, false, spb * b.bassRepeat);
        }
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
        const gain = b.sweepGain ?? 0.013;
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
        const gv = b.keyGlissGain != null ? b.keyGlissGain : 0.035;
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
        const gv = b.glissGain != null ? b.glissGain : 0.03;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gv, t + 0.02);
        g.gain.setValueAtTime(gv, t + spb * 3);
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
        // 808 kick: a long sine "boooom" that pitch-drops into a sub
        // fundamental for the thump, with a short noise click on the front so
        // it still reads as a hit on small speakers where the sub is felt more
        // than heard. Body + click, the way an 808 actually stacks — nothing
        // in between. crashDur-style bank overrides (kickGain/kickTail) let a
        // sparser track lean on the boom or a busy one tighten it up.
        const t = this.nextTime;
        const kg = b.kickGain ?? 1;
        const tail = b.kickTail ?? 0.2;      // how long the sub rings out
        // Body: near-instant punch, pitch envelope from a snappy attack pitch
        // down to ~48Hz, then a long amplitude decay. The short gain ramp (vs
        // the old hard setValueAtTime) keeps the envelope itself from clicking —
        // the click is authored separately below, so it can be shaped on its own.
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.05);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.42 * kg, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + tail);
        o.connect(g); g.connect(this.musicBus);
        if (b.echoEverything) g.connect(this.echoBus);
        o.start(t); o.stop(t + tail + 0.04);
        // Click: a couple of ms of high-passed noise — the beater attack. Kept
        // very short and quiet so it's a transient "tk", not a hat on top.
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const cf = this.ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 1900;
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(0.13 * kg, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        src.connect(cf); cf.connect(cg); cg.connect(this.musicBus);
        if (b.echoEverything) cg.connect(this.echoBus);
        src.start(t); src.stop(t + 0.03);
        // Knock: a short mid punch (~200-300Hz) between the click and the sub.
        // The bass owns the low fundamentals and the sub boom competes with it
        // there; this transient lives in a band the bass mostly leaves open, so
        // it gives the kick a defined attack that cuts through the low end
        // instead of masking into it. kickKnock scales it per-track (0 = off).
        const knock = b.kickKnock ?? 1;
        if (knock > 0) {
          const k = this.ctx.createOscillator(); const kgn = this.ctx.createGain();
          k.type = 'triangle';
          k.frequency.setValueAtTime(300, t);
          k.frequency.exponentialRampToValueAtTime(180, t + 0.04);
          kgn.gain.setValueAtTime(0.0001, t);
          kgn.gain.exponentialRampToValueAtTime(0.17 * kg * knock, t + 0.004);
          kgn.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          k.connect(kgn); kgn.connect(this.musicBus);
          if (b.echoEverything) kgn.connect(this.echoBus);
          k.start(t); k.stop(t + 0.07);
        }
      }
      if (b.hats && b.hats[s]) {
        const t = this.nextTime;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(this.musicBus);
        if (b.echoEverything) g.connect(this.echoBus);
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
        if (b.echoEverything) mix.connect(this.echoBus);
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
        if (b.echoEverything) mix.connect(this.echoBus);
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
        if (b.echoEverything) g.connect(this.echoBus);
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
        if (b.echoEverything) g.connect(this.echoBus);
        src.start(t); src.stop(t + 0.11);
        const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(og); og.connect(this.musicBus); if (b.echoEverything) og.connect(this.echoBus); o.start(t); o.stop(t + 0.08);
      }
      if (b.crash && b.crash[s]) {
        // Filtered crash: looped noise, bright on the transient and darkening
        // as it falls away — a lowpass envelope closes from crashOpen down to
        // crashClose across the hit, which is what makes it read as a cymbal
        // decaying rather than a burst of static. The fixed highpass keeps the
        // low end out so it stays snarey and thin. Longer than the snare's
        // 90ms crack, short enough not to wash over the downbeat it leads to.
        const t = this.nextTime;
        const dur = spb * (b.crashDur || 5);
        const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(b.crashOpen ?? 9000, t);
        lp.frequency.exponentialRampToValueAtTime(b.crashClose ?? 1100, t + dur);
        const g = this.ctx.createGain();
        const gain = b.crashGain ?? 0.15;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.005); // near-instant transient so it reads as on the beat
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.musicBus);
        // Percussion is dry on the echo bus by default; crashEcho opts this
        // lane in on its own, so a crash can trail off into the delay without
        // dragging the rest of the kit in with it.
        if (b.crashEcho || b.echoEverything) g.connect(this.echoBus);
        src.start(t); src.stop(t + dur + 0.03);
      }
      if (b.rim && b.rim[s]) {
        // Rimshot: a stick cracking off the rim. The old version was two square
        // tones dead in 40ms — a bare click. This stacks three layers so it
        // reads as a struck object with a little tail: a noise SNAP for the
        // stick attack, a cluster of detuned square partials for the metallic
        // RING (pitch sagging slightly as it decays), and a low woody TONK
        // underneath for body. Two-stage decay out to ~75ms — a fast transient
        // then a brief ring, instead of one flat drop to silence.
        const t = this.nextTime;
        const lvl = b.rimGain ?? 0.21;
        // Metallic ring: three inharmonic partials through a narrow bandpass.
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 3.6;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(lvl, t);
        g.gain.exponentialRampToValueAtTime(lvl * 0.16, t + 0.02); // fast initial transient
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);     // short ring-out tail
        for (const fr of [1720, 2630, 3350]) {
          const o = this.ctx.createOscillator();
          o.type = 'square';
          o.frequency.setValueAtTime(fr, t);
          o.frequency.exponentialRampToValueAtTime(fr * 0.94, t + 0.06); // slight pitch sag as it rings
          o.connect(f);
          o.start(t); o.stop(t + 0.09);
        }
        f.connect(g); g.connect(this.musicBus);
        // Only the ring trails into the echo, and softly — a dedicated low-gain
        // send taps it below the melodic lanes' level so it's a faint repeat,
        // not a wash. rimEcho scales it per-track (0 = dry); the snap and tonk
        // stay dry so the echo doesn't smear their transients.
        const re = this.ctx.createGain(); re.gain.value = b.rimEcho ?? 0.3;
        g.connect(re); re.connect(this.echoBus);
        // Stick snap: a few ms of high-passed noise — the attack transient that
        // gives the click its bite before the ring takes over.
        const sn = this.ctx.createBufferSource(); sn.buffer = this.noiseBuf;
        const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3200;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(lvl * 0.45, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        sn.connect(nf); nf.connect(ng); ng.connect(this.musicBus);
        if (b.echoEverything) ng.connect(this.echoBus);
        sn.start(t); sn.stop(t + 0.03);
        // Woody body: a low resonant "tonk" the click sits on, so the rimshot
        // has some weight instead of being pure top end.
        const bo = this.ctx.createOscillator(); const bg = this.ctx.createGain();
        bo.type = 'triangle';
        bo.frequency.setValueAtTime(430, t);
        bo.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        bg.gain.setValueAtTime(lvl * 0.38, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        bo.connect(bg); bg.connect(this.musicBus);
        if (b.echoEverything) bg.connect(this.echoBus);
        bo.start(t); bo.stop(t + 0.08);
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
          if (b.echoEverything) g.connect(this.echoBus);
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
