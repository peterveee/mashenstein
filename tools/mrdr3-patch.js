// Versioned, URL-safe snapshots for the standalone MRDR-3 playground.

export const PATCH_VERSION = 1;
const RUNTIME_OR_CATALOGUE_KEYS = new Set([
  'id', 'kind', 'level', 'peak', 'songLocal', 'factory', 'user', 'draft', 'starter',
  'quoted', 'nameOnly', 'songOrigin', 'songSourceId',
]);

const bytesToBase64 = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
const base64ToBytes = (text) => {
  const normalized = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export function encodePatch(voice) {
  if (!voice || voice.synth !== 'MRDR-3') throw new Error('Only MRDR-3 sounds can be shared');
  const snapshot = Object.fromEntries(Object.entries(voice)
    .filter(([key]) => !RUNTIME_OR_CATALOGUE_KEYS.has(key)));
  const payload = JSON.stringify({ v: PATCH_VERSION, engine: 'MRDR-3', voice: snapshot });
  return bytesToBase64(new TextEncoder().encode(payload));
}

export function decodePatch(encoded) {
  if (!encoded) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
    if (data?.v !== PATCH_VERSION || data.engine !== 'MRDR-3' || !data.voice
      || data.voice.synth !== 'MRDR-3' || typeof data.voice !== 'object'
      || Array.isArray(data.voice)) return null;
    if ([...RUNTIME_OR_CATALOGUE_KEYS].some((key) =>
      Object.prototype.hasOwnProperty.call(data.voice, key))) return null;
    return data.voice;
  } catch {
    return null;
  }
}
