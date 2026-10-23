import { FACTORY_PRESET_BROWSING } from './preset-browsing-catalog.js';

// Browsing only. Never use these families to decide lane compatibility or playback.
export const PRESET_TAXONOMY = {
  Bass: ['Synth', 'Electric', 'Acoustic', 'Sub', 'Other'],
  Leads: ['Analog-style', 'Digital', 'Vocal/Formant', 'Other'],
  Pads: ['Warm', 'Strings', 'Choir', 'Evolving', 'Textures', 'Other'],
  Keys: ['Piano', 'Electric Piano', 'Clav', 'Harpsichord', 'Synth Keys', 'Other'],
  Organs: ['Drawbar', 'Transistor', 'Pipe', 'Reed', 'Digital', 'Other'],
  Guitars: ['Acoustic', 'Clean Electric', 'Muted', 'Distorted', 'Other'],
  Strings: ['Solo', 'Ensemble', 'Plucked', 'Other'],
  Brass: ['Solo', 'Ensemble', 'Synth Brass', 'Other'],
  Winds: ['Saxophone', 'Flute', 'Reeds', 'Other'],
  Voices: ['Choir', 'Vowels', 'Synthetic', 'Speech', 'Other'],
  'Bells & Mallets': ['Bells', 'Tuned Percussion', 'Other'],
  'Synth Plucks': ['Short', 'Resonant', 'Metallic', 'Other'],
  'Drums & Percussion': ['Kick', 'Snare', 'Hats', 'Clap', 'Toms', 'Cymbals', 'Rim', 'Hand Percussion', 'Electronic Perc.', 'Other'],
  Effects: ['Sweeps', 'Impacts', 'Blips', 'Textures', 'Other'],
};
export const PRESET_CATEGORIES = Object.keys(PRESET_TAXONOMY);

const drumCategories = { Kick: 'Kick', Snare: 'Snare', Hats: 'Hats', Clap: 'Clap',
  Tom: 'Toms', Crash: 'Cymbals', Rim: 'Rim', Perc: 'Hand Percussion', Blip: 'Electronic Perc.' };

/** Compatibility fallback for older presets and song snapshots without browse metadata.
 * Deliberately reads names, not descriptive prose (which often compares OTHER sounds).
 * Explicit metadata wins, so a renamed user sound retains its filing.
 */
export function presetClassification(voice = {}) {
  const explicit = voice.browse;
  if (explicit && Array.isArray(PRESET_TAXONOMY[explicit.category])
    && PRESET_TAXONOMY[explicit.category].includes(explicit.subcategory)) {
    return { category: explicit.category, subcategory: explicit.subcategory };
  }
  const catalog = FACTORY_PRESET_BROWSING[voice.id];
  if (catalog) return { ...catalog };
  const name = (voice.label || '').toLowerCase();
  const old = voice.category || '';
  const pair = (category, subcategory = 'Other') => ({ category, subcategory });
  const has = (re) => re.test(name);
  if (old === 'Sweep') return pair('Effects', 'Sweeps');
  if (drumCategories[old]) {
    if (has(/blast|impact|thunder/)) return pair('Effects', 'Impacts');
    if (old === 'Crash' && has(/pew|whoosh/)) return pair('Effects', 'Sweeps');
    if (has(/conga|bongo|tambora|djembe|talking drum|shaker/)) return pair('Drums & Percussion', 'Hand Percussion');
    if (has(/\btom\b/)) return pair('Drums & Percussion', 'Toms');
    if (has(/\brim\b/)) return pair('Drums & Percussion', 'Rim');
    if (has(/zap|gate clang|ring tin|synare/)) return pair('Drums & Percussion', 'Electronic Perc.');
    return pair('Drums & Percussion', drumCategories[old]);
  }
  if (old === 'Bass') return pair('Bass', has(/\bsub\b|808/) ? 'Sub'
    : has(/bass guitar|bass, .*pickup|picked bass|fretless bass|thumb slap|slap pop|fret clack/) ? 'Electric'
      : has(/upright|double bass/) ? 'Acoustic' : 'Synth');
  if (has(/guitar|nylon|steel acoustic|12-string|clean electric|palm-muted electric|electric, .*pickup|funk chop/)) {
    return pair('Guitars', has(/muted/) ? 'Muted' : has(/distort|overdriv/) ? 'Distorted'
      : has(/acoustic|nylon|12-string/) ? 'Acoustic' : 'Clean Electric');
  }
  if (has(/harp(?!sichord)|koto|sitar|tanpura|banjo|mandolin|\bpizz/)) return pair('Strings', 'Plucked');
  if (has(/choir|chorus|chorister/) && !has(/grand/)) return pair('Voices', 'Choir');
  if (has(/announcer|eggshell says|cabinet voice|word per key/)) return pair('Voices', 'Speech');
  if (has(/vowel|vocal|\booh\b|\baah\b|aiueo/)) return pair('Voices', 'Vowels');
  if (voice.synth === 'JMJR-4' || has(/vox|talk box|doo.?wop|hummer|hum it|hums closed|small voice/)) return pair('Voices', 'Synthetic');
  if (has(/saxophone|sax-like/)) return pair('Winds', 'Saxophone');
  if (has(/flute|pan pipes|shakuhachi|bansuri|ocarina|recorder/)) return pair('Winds', 'Flute');
  if (has(/clarinet|oboe/) || (old === 'Orch' && has(/reed|breath|wind/))) return pair('Winds', 'Reeds');
  if (has(/string pad/)) return pair('Pads', 'Strings');
  if (has(/violin|viola|cello|contrabass|strings|string section|erhu/)) return pair('Strings',
    has(/section|strings/) ? 'Ensemble' : 'Solo');
  if (has(/brass|trumpet|tuba|horn/)) return pair('Brass', has(/synth|pwm|circuit|\bdx\b|\bam\b/) ? 'Synth Brass'
    : has(/section|stack|stab/) ? 'Ensemble' : 'Solo');
  if (has(/organ|drawbar/) || old === 'Organ') return pair('Organs',
    has(/drawbar|shop organ|swoop/) ? 'Drawbar' : has(/pipe|pedal/) ? 'Pipe'
      : has(/reed/) ? 'Reed' : has(/transistor|square/) ? 'Transistor' : 'Digital');
  if (has(/dulcimer|marimba|kalimba|steelpan|vibraphone|celest|music box|gong/)) return pair('Bells & Mallets', 'Tuned Percussion');
  if (has(/harpsichord/)) return pair('Keys', 'Harpsichord');
  if (has(/clav/)) return pair('Keys', 'Clav');
  if (has(/e-piano|electric piano|electric grand|electric keys|tine |fm keys|fm piano|tremolo keys/)) return pair('Keys', 'Electric Piano');
  if (has(/piano|grand|upright/)) return pair('Keys', 'Piano');
  if (old === 'Bells' || has(/bell lead/)) return pair('Bells & Mallets', 'Bells');
  if (old === 'Keys') return pair('Keys', 'Synth Keys');
  if (old === 'Lead' || has(/fm lead|scream|buzz saw/)) return pair('Leads',
    has(/vowel|reed|voice|talk|robot/) ? 'Vocal/Formant'
      : has(/fm|digital|ring|glass/) ? 'Digital' : 'Analog-style');
  if (old === 'Pad') return pair('Pads', has(/warm|soft|triangle/) ? 'Warm'
    : has(/evolv|orbit|sweep|puls|drift/) ? 'Evolving' : 'Textures');
  if (old === 'Pluck') return pair('Synth Plucks', has(/metal|steel|wire/) ? 'Metallic'
    : has(/resonan|filter/) ? 'Resonant' : 'Short');
  if (has(/sweep|riser|whoosh/)) return pair('Effects', 'Sweeps');
  if (has(/hit|impact/)) return pair('Effects', 'Impacts');
  if (has(/zap|blip/)) return pair('Effects', 'Blips');
  return pair('Effects', old === 'FX' ? 'Textures' : 'Other');
}
