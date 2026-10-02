// MAKE A BANGER — writing the sounds table back out as source. The one serialiser of
// tools/lib/banger/sounds.js: the Banger Sounds page's Save goes through it, and so does
// anything else that rewrites the file, so the file always reads the same way and a diff
// of it shows the choices that changed and nothing else.
//
// Browser-safe (it only builds a string); the server does the writing.

export const SOUNDS_HEADER = `// BANGER SOUNDS — every sound a banger is made with, per style.
//
// WRITTEN BY THE BANGER SOUNDS PAGE (\`npm run banger-sounds\`, http://localhost:8022/).
// Edit it there: every choice is checked against tools/lib/banger/sound-rules.js before
// it is saved, and each slot can be auditioned in its real job. A hand edit is fine too —
// tests/banger-sounds.js holds this file to the same rules — but the page rewrites the
// whole file on Save, so a comment added in here will not survive.
//
//   parts   one preset for each part the generator writes (bass, square double, saws …)
//   kits    the drum kits the Kit switch picks between; wherever a kit leaves a drum
//           out, the style kit's plays
//   random  the shortlists Riff Sound = Random draws from, by the job a riff part does
//   moods   per mood: \`parts\` overrides the style's choice, \`skip\` takes sounds out of
//           the Random lists
//   never   presets no banger in this style may use — not as a part, not in a kit, not
//           at random
//
// The style's music (progressions, patterns, the mix) is in tools/lib/banger/styles/.
`;

const q = (s) => JSON.stringify(s);

/** A list of ids, wrapped at about 96 characters, indented under its key. */
function idList(list, indent) {
  if (!list.length) return '[]';
  const lines = [];
  let line = '';
  for (const id of list) {
    const piece = `${q(id)}, `;
    if (line && indent.length + 2 + line.length + piece.length > 96) { lines.push(line.trimEnd()); line = ''; }
    line += piece;
  }
  lines.push(line.trimEnd().replace(/,$/, ''));
  if (lines.length === 1) return `[${lines[0]}]`;
  return `[\n${lines.map((l) => `${indent}  ${l}`).join('\n')}\n${indent}]`;
}

/** `{ key: "id", … }`, four to a line. */
function idMap(obj, indent) {
  const entries = Object.entries(obj || {}).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '{}';
  const lines = [];
  for (let i = 0; i < entries.length; i += 3) {
    lines.push(entries.slice(i, i + 3).map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k)}: ${q(v)}`).join(', '));
  }
  return `{\n${lines.map((l) => `${indent}  ${l},`).join('\n')}\n${indent}}`;
}

const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k));

/** The whole file, from a table. */
export function soundsSource(table) {
  const out = [SOUNDS_HEADER, 'export const BANGER_SOUNDS = {'];
  for (const [styleId, s] of Object.entries(table)) {
    out.push(`  ${key(styleId)}: {`);
    out.push(`    parts: ${idMap(s.parts, '    ')},`);
    out.push('    kits: {');
    for (const [kitId, roles] of Object.entries(s.kits || {})) out.push(`      ${key(kitId)}: ${idMap(roles, '      ')},`);
    out.push('    },');
    out.push('    random: {');
    for (const [job, list] of Object.entries(s.random || {})) out.push(`      ${key(job)}: ${idList(list, '      ')},`);
    out.push('    },');
    out.push('    choices: {');
    for (const [k, list] of Object.entries(s.choices || {})) out.push(`      ${key(k)}: ${idList(list, '      ')},`);
    out.push('    },');
    out.push('    moods: {');
    for (const [mood, m] of Object.entries(s.moods || {})) {
      const parts = idMap(m?.parts, '        ');
      const skip = idList(m?.skip || [], '        ');
      out.push(`      ${key(mood)}: {\n        parts: ${parts},\n        skip: ${skip},\n      },`);
    }
    out.push('    },');
    out.push(`    never: ${idList(s.never || [], '    ')},`);
    out.push('  },');
  }
  out.push('};', '');
  return out.join('\n');
}

/** A table with every list and map in a fixed order and nothing it does not need. */
export function tidyTable(table) {
  const out = {};
  for (const [styleId, s] of Object.entries(table || {})) {
    const moods = {};
    for (const [mood, m] of Object.entries(s.moods || {})) {
      const parts = Object.fromEntries(Object.entries(m?.parts || {}).filter(([, v]) => v));
      moods[mood] = { parts, skip: [...new Set(m?.skip || [])] };
    }
    const kits = {};
    for (const [kitId, roles] of Object.entries(s.kits || {})) {
      kits[kitId] = Object.fromEntries(Object.entries(roles || {}).filter(([, v]) => v));
    }
    out[styleId] = {
      parts: Object.fromEntries(Object.entries(s.parts || {}).filter(([, v]) => v)),
      kits,
      random: Object.fromEntries(Object.entries(s.random || {}).map(([k, list]) => [k, [...new Set(list || [])]])),
      choices: Object.fromEntries(Object.entries(s.choices || {}).filter(([, list]) => list?.length).map(([k, list]) => [k, [...new Set(list)]])),
      moods,
      never: [...new Set(s.never || [])],
    };
  }
  return out;
}
