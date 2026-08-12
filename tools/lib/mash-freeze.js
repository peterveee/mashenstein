// MASHENSTEIN user-saved frozen-audio file format.
//
// The PCM is stored as the original stereo Float32 bit patterns: no WAV conversion,
// normalisation or compression. A small JSON header carries the musical coordinate
// and source fingerprint needed to decide whether it is still safe to load.

const MAGIC_TEXT = 'MSHFRZ1\0';
const MAGIC = new TextEncoder().encode(MAGIC_TEXT);
const HEADER_BYTES = 12; // 8-byte magic + uint32 JSON byte length
export const MASH_FREEZE_VERSION = 1;
const BUNDLE_MAGIC = new TextEncoder().encode('MSHFRZB1');
export const MASH_FREEZE_BUNDLE_VERSION = 1;

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();

export function freezeCrc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const crc32Update = (crc, bytes, from = 0, to = bytes.length) => {
  let c = crc;
  for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return c;
};

const crc32Hex = (crc) => ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');

const yieldTask = () => new Promise((resolve) => {
  if (typeof MessageChannel === 'undefined') { setTimeout(resolve, 0); return; }
  const channel = new MessageChannel();
  channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); };
  channel.port2.postMessage(0);
});

const ASYNC_CHUNK_BYTES = 512 * 1024;

async function crc32Parts(parts, { progress, completed = 0, total = 1 } = {}) {
  let crc = 0xffffffff;
  let done = completed;
  for (const bytes of parts) {
    for (let at = 0; at < bytes.length; at += ASYNC_CHUNK_BYTES) {
      const end = Math.min(bytes.length, at + ASYNC_CHUNK_BYTES);
      crc = crc32Update(crc, bytes, at, end);
      done += end - at;
      progress?.(Math.min(1, done / total));
      await yieldTask();
    }
  }
  return { hex: crc32Hex(crc), completed: done };
}

const floatBytes = (array) => new Uint8Array(array.buffer, array.byteOffset, array.byteLength);

export function encodeMashFreeze({ metadata = {}, left, right = left }) {
  if (!(left instanceof Float32Array) || !(right instanceof Float32Array)
    || !left.length || right.length !== left.length) {
    throw new Error('freeze PCM must be equal non-empty Float32 stereo channels');
  }
  const body = new Uint8Array(left.byteLength + right.byteLength);
  body.set(floatBytes(left), 0);
  body.set(floatBytes(right), left.byteLength);
  const header = {
    ...metadata,
    format: 'MASHENSTEIN_FREEZE',
    version: MASH_FREEZE_VERSION,
    channels: 2,
    encoding: 'float32-planar-native-le',
    frames: left.length,
    pcmCrc32: freezeCrc32(body).toString(16).padStart(8, '0'),
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  const out = new Uint8Array(HEADER_BYTES + json.length + body.length);
  out.set(MAGIC, 0);
  new DataView(out.buffer).setUint32(8, json.length, true);
  out.set(json, HEADER_BYTES);
  out.set(body, HEADER_BYTES + json.length);
  return out;
}

export function decodeMashFreeze(input, { pcm = true, verify = true } = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < HEADER_BYTES || !MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error('not a MASHENSTEIN freeze file');
  }
  const jsonBytes = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true);
  const bodyAt = HEADER_BYTES + jsonBytes;
  if (jsonBytes < 2 || bodyAt > bytes.length) throw new Error('invalid freeze header length');
  let metadata;
  try { metadata = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER_BYTES, bodyAt))); }
  catch { throw new Error('invalid freeze metadata'); }
  if (metadata?.format !== 'MASHENSTEIN_FREEZE' || metadata.version !== MASH_FREEZE_VERSION
    || metadata.channels !== 2 || metadata.encoding !== 'float32-planar-native-le') {
    throw new Error(`unsupported freeze format version ${metadata?.version ?? '?'}`);
  }
  const frames = Math.floor(Number(metadata.frames));
  const expected = frames * Float32Array.BYTES_PER_ELEMENT * 2;
  if (!(frames > 0) || bytes.length - bodyAt !== expected) throw new Error('freeze PCM length does not match its header');
  const body = bytes.subarray(bodyAt);
  if (verify && freezeCrc32(body).toString(16).padStart(8, '0') !== metadata.pcmCrc32) {
    throw new Error('freeze PCM checksum failed');
  }
  if (!pcm) return { metadata };
  // Copy each channel into an aligned, independently-owned Float32Array. The input
  // may be a Node Buffer or a fetch view with an arbitrary byteOffset.
  const channelBytes = frames * 4;
  const leftBytes = body.slice(0, channelBytes);
  const rightBytes = body.slice(channelBytes);
  return {
    metadata,
    left: new Float32Array(leftBytes.buffer, leftBytes.byteOffset, frames).slice(),
    right: new Float32Array(rightBytes.buffer, rightBytes.byteOffset, frames).slice(),
  };
}

/** One song's independently ranged lane freezes in one portable file. */
export function encodeMashFreezeBundle({ metadata = {}, entries = [] }) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('freeze bundle must contain at least one freeze');
  const encoded = entries.map((entry) => encodeMashFreeze(entry));
  const payloadBytes = encoded.reduce((sum, bytes) => sum + bytes.length, 0);
  const payload = new Uint8Array(payloadBytes);
  let at = 0;
  for (const bytes of encoded) { payload.set(bytes, at); at += bytes.length; }
  const manifest = {
    ...metadata,
    format: 'MASHENSTEIN_FREEZE_BUNDLE',
    version: MASH_FREEZE_BUNDLE_VERSION,
    entries: encoded.map((bytes, index) => ({
      bytes: bytes.length,
      lane: entries[index].metadata?.lane,
      scopeId: entries[index].metadata?.scopeId,
    })),
    payloadCrc32: freezeCrc32(payload).toString(16).padStart(8, '0'),
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const out = new Uint8Array(HEADER_BYTES + json.length + payload.length);
  out.set(BUNDLE_MAGIC, 0);
  new DataView(out.buffer).setUint32(8, json.length, true);
  out.set(json, HEADER_BYTES);
  out.set(payload, HEADER_BYTES + json.length);
  return out;
}

/**
 * Write a bundle without ever materialising a second full copy of its PCM.
 *
 * The original encoder remains the small-buffer convenience API and defines the file
 * format. Export uses this path: it builds only the JSON prefixes, checksums the live
 * channel views in bounded chunks, then writes those views straight to the selected
 * file. The result is byte-for-byte the same format, but a 150 MB freeze no longer
 * briefly needs several additional 150 MB arrays and a long stop-the-world checksum.
 */
export async function writeMashFreezeBundle(writable, {
  metadata = {}, entries = [],
}, { onProgress } = {}) {
  if (!writable?.write || !Array.isArray(entries) || !entries.length) {
    throw new Error('freeze bundle writer needs a writable and at least one freeze');
  }
  for (const { left, right = left } of entries) {
    if (!(left instanceof Float32Array) || !(right instanceof Float32Array)
      || !left.length || right.length !== left.length) {
      throw new Error('freeze PCM must be equal non-empty Float32 stereo channels');
    }
  }

  const pcmBytes = entries.reduce((sum, entry) => {
    const right = entry.right || entry.left;
    return sum + entry.left.byteLength + right.byteLength;
  }, 0);
  // The PCM is visited once for each entry checksum and once for the outer payload
  // checksum. Prefixes are tiny, so two PCM passes are the useful progress denominator.
  const totalWork = Math.max(1, pcmBytes * 2);
  let completed = 0;
  const layouts = [];
  for (const entry of entries) {
    const right = entry.right || entry.left;
    const leftBytes = floatBytes(entry.left);
    const rightBytes = floatBytes(right);
    const checked = await crc32Parts([leftBytes, rightBytes], {
      completed, total: totalWork, progress: onProgress,
    });
    completed = checked.completed;
    const header = {
      ...(entry.metadata || {}),
      format: 'MASHENSTEIN_FREEZE',
      version: MASH_FREEZE_VERSION,
      channels: 2,
      encoding: 'float32-planar-native-le',
      frames: entry.left.length,
      pcmCrc32: checked.hex,
    };
    const json = new TextEncoder().encode(JSON.stringify(header));
    const prefix = new Uint8Array(HEADER_BYTES + json.length);
    prefix.set(MAGIC, 0);
    new DataView(prefix.buffer).setUint32(8, json.length, true);
    prefix.set(json, HEADER_BYTES);
    layouts.push({ prefix, leftBytes, rightBytes, bytes: prefix.length + leftBytes.length + rightBytes.length });
  }

  const payloadParts = layouts.flatMap((layout) => [layout.prefix, layout.leftBytes, layout.rightBytes]);
  const payloadBytes = layouts.reduce((sum, layout) => sum + layout.bytes, 0);
  const payloadChecked = await crc32Parts(payloadParts, {
    completed, total: totalWork, progress: onProgress,
  });
  const manifest = {
    ...metadata,
    format: 'MASHENSTEIN_FREEZE_BUNDLE',
    version: MASH_FREEZE_BUNDLE_VERSION,
    entries: layouts.map((layout, index) => ({
      bytes: layout.bytes,
      lane: entries[index].metadata?.lane,
      scopeId: entries[index].metadata?.scopeId,
    })),
    payloadCrc32: payloadChecked.hex,
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const prefix = new Uint8Array(HEADER_BYTES + json.length);
  prefix.set(BUNDLE_MAGIC, 0);
  new DataView(prefix.buffer).setUint32(8, json.length, true);
  prefix.set(json, HEADER_BYTES);

  const writePart = async (bytes) => {
    for (let at = 0; at < bytes.length; at += ASYNC_CHUNK_BYTES) {
      await writable.write(bytes.subarray(at, Math.min(bytes.length, at + ASYNC_CHUNK_BYTES)));
      await yieldTask();
    }
  };
  await writePart(prefix);
  for (const layout of layouts) {
    await writePart(layout.prefix);
    await writePart(layout.leftBytes);
    await writePart(layout.rightBytes);
  }
  onProgress?.(1);
  return { byteLength: prefix.length + payloadBytes, payloadBytes };
}

export function decodeMashFreezeBundle(input, { pcm = true, verify = true } = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < HEADER_BYTES || !BUNDLE_MAGIC.every((value, index) => bytes[index] === value)) {
    throw new Error('not a MASHENSTEIN freeze bundle');
  }
  const jsonBytes = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true);
  const payloadAt = HEADER_BYTES + jsonBytes;
  if (jsonBytes < 2 || payloadAt > bytes.length) throw new Error('invalid freeze bundle header length');
  let metadata;
  try { metadata = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER_BYTES, payloadAt))); }
  catch { throw new Error('invalid freeze bundle metadata'); }
  if (metadata?.format !== 'MASHENSTEIN_FREEZE_BUNDLE'
    || metadata.version !== MASH_FREEZE_BUNDLE_VERSION || !Array.isArray(metadata.entries)
    || !metadata.entries.length) {
    throw new Error(`unsupported freeze bundle version ${metadata?.version ?? '?'}`);
  }
  const payload = bytes.subarray(payloadAt);
  if (verify && freezeCrc32(payload).toString(16).padStart(8, '0') !== metadata.payloadCrc32) {
    throw new Error('freeze bundle checksum failed');
  }
  const entries = [];
  let at = 0;
  for (const listed of metadata.entries) {
    const length = Math.floor(Number(listed?.bytes));
    if (!(length > 0) || at + length > payload.length) throw new Error('freeze bundle entry length is invalid');
    const decoded = decodeMashFreeze(payload.subarray(at, at + length), { pcm, verify });
    if (decoded.metadata.lane !== listed.lane || decoded.metadata.scopeId !== listed.scopeId) {
      throw new Error('freeze bundle manifest does not match its PCM entries');
    }
    entries.push(decoded); at += length;
  }
  if (at !== payload.length) throw new Error('freeze bundle has trailing data');
  return { metadata, entries };
}
