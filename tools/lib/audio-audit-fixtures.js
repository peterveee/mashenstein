// DELIBERATELY BROKEN AUDIO GRAPHS, AND THEIR FIXED TWINS (docs/AUDIO_SYNTH_AUDIT_PLAN.md,
// Stage 1b, 21 Oct 2026). tools/audio-audit.js `fixture <name>` plays one of these in place of
// a synth: `note` runs every quarter second while the subject is sounding, into `out`, a gain
// on its way to the speakers. tests/audio-audit-selftest.js checks the harness gives each the
// verdict in `expect` — a harness that cannot fail these cannot be trusted to pass a synth.
//
// `mode` is the instrumentation each needs: 'graph' counts what stays wired and running,
// 'memory' counts what stays allocated (and must not itself hold what it counts).

const osc = (ctx, t, len, freq = 220) => {
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  o.start(t); o.stop(t + len);
  return o;
};

export const FIXTURES = {
  // KNDO-5 before 20 Oct: every note's graph left on the lane when the note ended.
  'unwired-note': { expect: 'LEAK', note(ctx, out, t) {
    const o = osc(ctx, t, 0.15), g = ctx.createGain();
    o.connect(g); g.connect(out);
  } },
  'unwired-note-fixed': { expect: 'ok', note(ctx, out, t) {
    const o = osc(ctx, t, 0.15), g = ctx.createGain();
    o.connect(g); g.connect(out);
    o.onended = () => g.disconnect();
  } },

  // JMJR-4 / MRDR-3 before 21 Oct: a modulator told to stop AFTER its carrier. The carrier
  // ends and is unplugged; nothing pulls the modulator any more, so it never reaches its stop
  // and never ends — a source running for the rest of the session.
  'orphan-mod': { expect: 'LEAK', note(ctx, out, t) {
    const o = osc(ctx, t, 0.15), g = ctx.createGain(), lfo = osc(ctx, t, 0.3, 5), depth = ctx.createGain();
    depth.gain.value = 10;
    lfo.connect(depth); depth.connect(o.frequency);
    o.connect(g); g.connect(out);
    o.onended = () => g.disconnect();
  } },
  'orphan-mod-fixed': { expect: 'ok', note(ctx, out, t) {
    const o = osc(ctx, t, 0.15), g = ctx.createGain(), lfo = osc(ctx, t, 0.15 - 0.008, 5), depth = ctx.createGain();
    depth.gain.value = 10;
    lfo.connect(depth); depth.connect(o.frequency);
    o.connect(g); g.connect(out);
    o.onended = () => g.disconnect();
  } },

  // A source wired only into an AudioParam of something that stays — invisible to a harness
  // that records node-to-node connections only (the Stage 1 harness).
  'param-leak': { expect: 'LEAK', setup(ctx, out, st) {
    st.bus = ctx.createGain(); st.bus.connect(out);
  }, note(ctx, out, t, st) {
    const c = ctx.createConstantSource(); c.offset.value = 0;
    c.connect(st.bus.gain); c.start(t); c.stop(t + 0.1);
    const o = osc(ctx, t, 0.1), g = ctx.createGain();
    o.connect(g); g.connect(st.bus); o.onended = () => g.disconnect();
  } },
  'param-leak-fixed': { expect: 'ok', setup(ctx, out, st) {
    st.bus = ctx.createGain(); st.bus.connect(out);
  }, note(ctx, out, t, st) {
    const c = ctx.createConstantSource(); c.offset.value = 0;
    c.connect(st.bus.gain); c.start(t); c.stop(t + 0.1);
    c.onended = () => c.disconnect();
    const o = osc(ctx, t, 0.1), g = ctx.createGain();
    o.connect(g); g.connect(st.bus); o.onended = () => g.disconnect();
  } },

  // Two outputs, one unplugged: `disconnect(0)` is not "disconnect everything".
  'partial-disconnect': { expect: 'LEAK', note(ctx, out, t) {
    const o = osc(ctx, t, 0.1), s = ctx.createChannelSplitter(2);
    o.connect(s); s.connect(out, 0); s.connect(out, 1);
    o.onended = () => s.disconnect(0);
  } },
  'partial-disconnect-fixed': { expect: 'ok', note(ctx, out, t) {
    const o = osc(ctx, t, 0.1), s = ctx.createChannelSplitter(2);
    o.connect(s); s.connect(out, 0); s.connect(out, 1);
    o.onended = () => { s.disconnect(0); s.disconnect(out, 1); };
  } },

  // A song replaced every two seconds whose chain is unplugged at the head only: the tail
  // stays on the bus — incomplete cleanup on song replacement.
  'replace-leftover': { expect: 'LEAK', note(ctx, out, t, st) {
    if (st.tick % 8) return;
    if (st.chain) st.chain[0].disconnect();
    const c = [ctx.createGain(), ctx.createGain(), ctx.createGain()];
    c[0].connect(c[1]); c[1].connect(c[2]); c[2].connect(out);
    osc(ctx, t, 0.2).connect(c[0]);
    st.chain = c;
  } },
  'replace-leftover-fixed': { expect: 'ok', note(ctx, out, t, st) {
    if (st.tick % 8) return;
    if (st.chain) st.chain[2].disconnect(out);
    const c = [ctx.createGain(), ctx.createGain(), ctx.createGain()];
    c[0].connect(c[1]); c[1].connect(c[2]); c[2].connect(out);
    const o = osc(ctx, t, 0.2); o.connect(c[0]); o.onended = () => o.disconnect();
    st.chain = c;
  } },

  // One node every ten seconds — under the Stage 1 harness's threshold of 20.
  'slow-leak': { expect: 'LEAK', note(ctx, out, t, st) {
    const o = osc(ctx, t, 0.1), g = ctx.createGain();
    o.connect(g); g.connect(out);
    if (st.tick % 40) o.onended = () => g.disconnect();
  } },

  // A pool: eight voices made once and reused. Flat — must pass.
  pool: { expect: 'ok', note(ctx, out, t, st) {
    st.voices ||= [];
    if (st.voices.length < 8) {
      const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(out); o.start();
      st.voices.push(g);
    }
    const g = st.voices[st.tick % st.voices.length].gain;
    g.setValueAtTime(0.2, t); g.setValueAtTime(0, t + 0.1);
  } },

  // Every note held on for eight seconds after it ends: longer than the harness's 5 s
  // silence. The same at both silences — must pass.
  'long-tail': { expect: 'ok', note(ctx, out, t) {
    const o = osc(ctx, t, 0.1), g = ctx.createGain();
    o.connect(g); g.connect(out);
    o.onended = () => setTimeout(() => g.disconnect(), 8000);
  } },

  // A connection that throws (no output 3 on a gain) must not be recorded as made.
  'bad-connect': { expect: 'ok', note(ctx, out, t) {
    const g = ctx.createGain();
    try { g.connect(out, 3); } catch { /* the point */ }
    const o = osc(ctx, t, 0.1), h = ctx.createGain();
    o.connect(h); h.connect(out); o.onended = () => h.disconnect();
  } },

  // A worklet that never loads, so nothing sounds: UNAVAILABLE, never "cheap and clean".
  'worklet-fails': { expect: 'UNAVAILABLE', setup(ctx) {
    const bad = URL.createObjectURL(new Blob(['registerProcessor("x", '], { type: 'application/javascript' }));
    ctx.audioWorklet?.addModule(bad).catch(() => {});
  }, note(ctx, out) {
    try { new AudioWorkletNode(ctx, 'x').connect(out); } catch { /* not registered */ }
  } },

  // Memory: a buffer per note kept in a list nobody reads.
  'retained-buffer': { expect: 'LEAK', mode: 'memory', note(ctx, out, t, st) {
    const b = ctx.createBuffer(1, 48000, ctx.sampleRate);
    b.getChannelData(0).fill(0.05);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); s.stop(t + 0.05);
    s.onended = () => s.disconnect();
    (st.keep ||= []).push(b);
  } },
  'retained-buffer-fixed': { expect: 'ok', mode: 'memory', note(ctx, out, t) {
    const b = ctx.createBuffer(1, 48000, ctx.sampleRate);
    b.getChannelData(0).fill(0.05);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); s.stop(t + 0.05);
    s.onended = () => s.disconnect();
  } },
};
