// A standard MIDI file reader, in about a page.
//
// There is no dependency here for the same reason there is no audio library in the
// game: the format is small, the parts we need are smaller, and a parser we own is
// one we can read when a file behaves oddly. Type 0 and type 1, metrical division
// only — SMPTE timecode files are rejected rather than silently misread.
//
// The counterpart of tools/lib/render-midi-bank.js, which writes these.

const readVlq = (buf, at) => {
  let value = 0, p = at;
  for (;;) {
    const b = buf[p++];
    value = (value << 7) | (b & 0x7f);
    if (!(b & 0x80)) break;
    if (p > at + 4) throw new Error('malformed variable-length quantity');
  }
  return [value, p];
};

/**
 * @param {Buffer} buf
 * @returns {{format:number, ppq:number, tracks:Array<{name:string, events:Array}>}}
 *   events are {tick, type, ch, a, b} for channel messages and {tick, meta, data}
 *   for meta events, in absolute ticks.
 */
export function parseMidi(buf) {
  if (buf.length < 14 || buf.toString('ascii', 0, 4) !== 'MThd') {
    throw new Error('not a MIDI file (no MThd header)');
  }
  const headerLen = buf.readUInt32BE(4);
  const format = buf.readUInt16BE(8);
  const ntracks = buf.readUInt16BE(10);
  const division = buf.readInt16BE(12);
  if (division <= 0) {
    throw new Error('SMPTE timecode division is not supported — export with a metrical (PPQ) division');
  }

  const tracks = [];
  let p = 8 + headerLen;
  for (let t = 0; t < ntracks && p + 8 <= buf.length; t++) {
    const id = buf.toString('ascii', p, p + 4);
    const len = buf.readUInt32BE(p + 4);
    const end = Math.min(p + 8 + len, buf.length);
    if (id !== 'MTrk') { p = end; continue; }        // skip anything that is not a track

    let q = p + 8, tick = 0, status = 0, name = '';
    const events = [];
    while (q < end) {
      const [delta, afterDelta] = readVlq(buf, q);
      q = afterDelta;
      tick += delta;
      if (buf[q] & 0x80) status = buf[q++];          // otherwise: running status
      if (status === 0xff) {
        const meta = buf[q++];
        const [mlen, afterLen] = readVlq(buf, q);
        q = afterLen;
        const data = buf.subarray(q, q + mlen);
        q += mlen;
        if (meta === 0x03 && !name) name = data.toString('ascii');
        events.push({ tick, meta, data });
      } else if (status === 0xf0 || status === 0xf7) {
        const [slen, afterLen] = readVlq(buf, q);    // sysex: skipped whole
        q = afterLen + slen;
      } else {
        const type = status & 0xf0;
        const ch = status & 0x0f;
        const a = buf[q++];
        // Program change and channel pressure carry one byte; everything else two.
        const b = (type === 0xc0 || type === 0xd0) ? 0 : buf[q++];
        events.push({ tick, type, ch, a, b });
      }
    }
    tracks.push({ name, events });
    p = end;
  }
  return { format, ppq: division, tracks };
}

/** Microseconds per quarter note from the first tempo event, as BPM. */
export function tempoOf(parsed) {
  for (const track of parsed.tracks) {
    for (const e of track.events) {
      if (e.meta === 0x51 && e.data.length === 3) {
        const usPerQuarter = (e.data[0] << 16) | (e.data[1] << 8) | e.data[2];
        if (usPerQuarter > 0) return 60e6 / usPerQuarter;
      }
    }
  }
  return null;
}

/**
 * Notes per track, pairing each note-on with its note-off. A note-on at velocity 0
 * is a note-off — half the files in the world are written that way.
 */
export function notesOf(track) {
  const open = new Map();
  const notes = [];
  for (const e of track.events) {
    if (e.type !== 0x80 && e.type !== 0x90) continue;
    const key = `${e.ch}:${e.a}`;
    const isOn = e.type === 0x90 && e.b > 0;
    if (isOn) {
      if (!open.has(key)) open.set(key, []);
      open.get(key).push({ ch: e.ch, note: e.a, vel: e.b, on: e.tick });
    } else {
      const stack = open.get(key);
      const started = stack && stack.shift();
      if (started) { started.off = e.tick; notes.push(started); }
    }
  }
  // Anything still held at the end of the track ends there.
  for (const stack of open.values()) {
    for (const nt of stack) { nt.off = nt.on + 1; notes.push(nt); }
  }
  return notes.sort((a, b) => a.on - b.on || a.note - b.note);
}
