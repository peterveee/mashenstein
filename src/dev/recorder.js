// Dev recorder: what the player sees and hears, straight to an MP4 on disk.
//
// Dev builds only — reached through the dev menu (RECORD ▸, and RECORD BOT-PLAY
// on every stage and boss) or the closed-menu R key, and never bundled into a
// published build because nothing outside src/dev/ imports it.
//
// The picture is the presented canvas itself, via captureStream(), so the file
// holds exactly the composite on screen — WebGL or 2D backend, at the canvas's
// real device-pixel size — and the sound is the audio master, so the mix in the
// file is the mix in the room. It records in real time: a run that takes
// ninety seconds to play takes ninety seconds to record, and a frame the game
// drops is a frame the file drops. For an offline, never-drops-a-frame render
// of a VISUALISER see tools/render-video.js; there is no offline path for a
// run, because a run is driven by the live audio clock.
//
// MediaRecorder writes whatever container the browser prefers — Chrome and
// Safari on this Mac can both mux H.264 into MP4 directly; anything else falls
// back to WebM. Either way the clip is POSTed to the dev server, which remuxes
// (or transcodes) it with ffmpeg into work/video/<name>.mp4 and answers with
// the path. If the server cannot be reached the raw file is offered as a
// browser download instead, so a recording is never lost to plumbing.
import { presentCanvas, W, H } from '../engine/renderer.js';
import { Audio } from '../engine/audio.js';
import { currentState, isTransitioning } from '../engine/states.js';

// Preference order. H.264-in-MP4 first, because that is the deliverable and
// the server can then remux it losslessly (-c copy); the WebM shapes all cost
// a transcode. Chrome only knows the codec spellings it ships, so the list is
// walked with isTypeSupported rather than assumed.
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

// The frame rate captureStream is asked for. The game presents at the display
// rate; asking for 60 means a 120Hz panel is thinned rather than doubled.
const CAPTURE_FPS = 60;
// Generous: the encoder is hardware on this Mac and the clip is remuxed, not
// re-encoded, so the bits in the file are the bits chosen here. Pixel art with
// hard edges shows every byte of quantisation, so err high.
const VIDEO_BPS = 24e6;
const AUDIO_BPS = 256e3;

const ROUTE = '/__dev/record';

// A state-bound recording (RECORD BOT-PLAY) opens and closes on black rather
// than on the arcade shutter, which is a plum sticker with a hero on it and no
// part of the run. The recorder paints its own cover over the whole frame:
// opaque for the lead (from the button press until the incoming shutter has
// fully opened), fading out over FADE_IN_S, opaque again over the state's
// outro (AttractState.recordingOutro) and for a TAIL_S beat once the outgoing
// transition starts, then the file stops. The audio tap is ramped to match.
const FADE_IN_S = 0.4;
const OUTRO_FADE_S = 0.6;
const TAIL_S = 0.4;

function pickMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function extOf(mime) {
  return /mp4/.test(mime) ? 'mp4' : 'webm';
}

export function recordingSupported() {
  const canvas = presentCanvas();
  return !!(canvas && typeof canvas.captureStream === 'function' && pickMime());
}

export const Recorder = {
  active: false,
  saving: false,
  name: null,
  mime: null,
  startedAt: 0,
  hasAudio: false,
  lastPath: null,     // where the last clip landed, for the menu
  lastError: null,
  // The state whose life the recording is tied to (RECORD BOT-PLAY). Armed once
  // that state has actually arrived — setState() defers enter() behind the
  // shutter, so on the frame the recording starts the current state is still
  // the one being left.
  boundState: null,
  phase: null,        // 'lead' | 'live' | 'tail' while bound, else null
  phaseT: 0,
  cover: 0,           // alpha of the black cover Dev.draw paints for us
  _outroFading: false,
  _rec: null,
  _chunks: [],
  _stopped: null,
  _title: null,
  _onSaved: null,

  /**
   * Begin recording the presented canvas. Returns null on success or a short
   * message saying why not, phrased for Dev.say.
   *   name     file stem; the timestamp is appended
   *   state    optional State — the recording stops itself when it is left
   *   onSaved  optional ({path, error}) callback once the file is on disk
   */
  start({ name = 'rec', state = null, onSaved = null } = {}) {
    if (this.active) return 'ALREADY RECORDING';
    if (this.saving) return 'STILL SAVING THE LAST ONE';
    const canvas = presentCanvas();
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return 'RECORDING UNAVAILABLE IN THIS BROWSER';
    }
    const mime = pickMime();
    if (!mime) return 'NO MP4/WEBM ENCODER IN THIS BROWSER';

    const stream = new MediaStream();
    for (const t of canvas.captureStream(CAPTURE_FPS).getVideoTracks()) stream.addTrack(t);
    let audio = null;
    try { audio = Audio.captureStream(); } catch (e) { audio = null; }
    this.hasAudio = false;
    if (audio) {
      for (const t of audio.getAudioTracks()) { stream.addTrack(t); this.hasAudio = true; }
    }

    let rec;
    try {
      rec = new MediaRecorder(stream, {
        mimeType: mime, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS,
      });
    } catch (e) {
      return `RECORDER REFUSED: ${e.message}`;
    }
    this._chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) this._chunks.push(e.data); };
    rec.onerror = (e) => { this.lastError = String(e.error || e.message || e); console.warn('[rec]', e); };
    this._stopped = new Promise((done) => { rec.onstop = () => done(); });
    // One-second slices: a tab that crashes mid-run still leaves the slices
    // already handed over, and the final blob is just their concatenation.
    rec.start(1000);

    this._rec = rec;
    this.mime = mime;
    this.name = `${name}-${stamp()}`;
    this.startedAt = performance.now();
    this.boundState = state;
    this.phase = state ? 'lead' : null;
    this.phaseT = 0;
    this.cover = state ? 1 : 0;
    this._outroFading = false;
    // A bound take opens on silence and fades in with the picture; a
    // free-running one records what the room hears from the first frame.
    try { Audio.setCaptureLevel(state ? 0 : 1, 0); } catch (e) { /* no tap */ }
    this._onSaved = onSaved;
    this.lastError = null;
    this.active = true;
    if (typeof document !== 'undefined') {
      this._title = document.title;
      document.title = `● REC  ${this._title}`;
    }
    return null;
  },

  /** Seconds recorded so far. */
  elapsed() {
    return this.active ? (performance.now() - this.startedAt) / 1000 : 0;
  },

  /** Stops and saves. Resolves to {path} or {error}; safe to call when idle. */
  async stop() {
    if (!this.active || !this._rec) return { error: 'NOT RECORDING' };
    const rec = this._rec;
    const mime = this.mime;
    const name = this.name;
    const onSaved = this._onSaved;
    this.active = false;
    this.boundState = null;
    this.phase = null;
    this.cover = 0;
    this._rec = null;
    this._onSaved = null;
    if (typeof document !== 'undefined' && this._title != null) {
      document.title = this._title;
      this._title = null;
    }
    try { if (rec.state !== 'inactive') rec.stop(); } catch (e) { /* already stopped */ }
    await this._stopped;
    for (const t of rec.stream.getTracks()) t.stop();
    const blob = new Blob(this._chunks, { type: mime });
    this._chunks = [];
    this.saving = true;
    const result = await this.save(blob, name, mime);
    this.saving = false;
    if (result.path) this.lastPath = result.path;
    if (result.error) this.lastError = result.error;
    if (onSaved) onSaved(result);
    return result;
  },

  /**
   * Hand the clip to the dev server, which owns ffmpeg and the work/ drawer.
   * Falls back to a browser download of the raw container when the server is
   * not there — a published build never gets here, but a dev build opened from
   * a static copy of dist/ might.
   */
  async save(blob, name, mime) {
    const ext = extOf(mime);
    if (!blob.size) return { error: 'EMPTY RECORDING' };
    try {
      const q = new URLSearchParams({ name, ext, mime, size: String(blob.size) });
      const res = await fetch(`${ROUTE}?${q}`, { method: 'POST', body: blob, headers: { 'content-type': mime } });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch (e) { body = null; }
      if (res.ok && body && body.path) return { path: body.path, note: body.note || null };
      return this.download(blob, `${name}.${ext}`, (body && body.error) || `server said ${res.status}`);
    } catch (e) {
      return this.download(blob, `${name}.${ext}`, e.message);
    }
  },

  download(blob, filename, why) {
    if (typeof document === 'undefined') return { error: why };
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { path: `~/Downloads/${filename}`, note: `dev server did not take it (${why}); raw ${filename.split('.').pop()} downloaded instead` };
  },

  /**
   * Called every frame from Dev.update, before the state updates. Walks a
   * state-bound recording through lead → live → tail (see the constants above)
   * and ends it once the bound state is on its way out, whichever way it went —
   * natural end, ESC, the watchdog, or a dev-menu jump somewhere else.
   */
  tick(dt) {
    if (!this.active || !this.boundState) return;
    const cur = currentState();
    const trans = isTransitioning();
    this.phaseT += dt;
    if (this.phase === 'lead') {
      this.cover = 1;
      if (cur === this.boundState && !trans) {
        this.phase = 'live';
        this.phaseT = 0;
        Audio.setCaptureLevel(1, FADE_IN_S);
      }
    } else if (this.phase === 'live') {
      if (cur !== this.boundState || trans) {
        this.phase = 'tail';
        this.phaseT = 0;
        this.cover = 1;
        Audio.setCaptureLevel(0, 0.05);
        return;
      }
      const fadeIn = 1 - Math.min(1, this.phaseT / FADE_IN_S);
      const outroT = Number(cur.recordingOutro) || 0;
      const outro = Math.min(1, outroT / OUTRO_FADE_S);
      if (outroT > 0 && !this._outroFading) {
        this._outroFading = true;
        Audio.setCaptureLevel(0, OUTRO_FADE_S);
      }
      this.cover = Math.max(fadeIn, outro);
    } else if (this.phase === 'tail') {
      this.cover = 1;
      if (this.phaseT >= TAIL_S) this.stop();
    }
  },

  /** The black cover, painted by Dev.draw above everything else on the frame. */
  drawCover(ctx) {
    if (!this.active || !this.boundState || this.cover <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.cover);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },
};
