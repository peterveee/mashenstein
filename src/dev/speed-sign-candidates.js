// Speed Zone roadside-sign bake-off.
//
// These are gallery-only proposals. They deliberately describe the sign face
// as data and use the production roadside painter for the post, contact soil,
// paper pass, board rim, and lettering. Nothing in this file is registered in
// the live scenery cycle until a sign is chosen.

const GREEN = '#416b56';
const GREEN_DARK = '#2f5146';
const CREAM = '#ead9a5';
const CREAM_LIGHT = '#f5edc9';
const YELLOW = '#d7b85f';
const ORANGE = '#d97b45';
const BROWN = '#80533e';
const BLUE = '#4b7274';
const INK = '#4c3f3e';

export const SPEED_SIGN_CANDIDATES = Object.freeze([
  {
    letter: 'A', name: 'city-limit board', shape: 'rectangle', kind: 'highway',
    w: 88, top: -59, bottom: -25, scale: 0.78,
    face: GREEN, trim: CREAM, ink: '#fff1bd',
    label: 'CITY LIMITS', value: 'MASHEN', labelCell: 0.67, valueCell: 1.46,
    note: 'Broad green town-entry board; tests a stronger arrival landmark.'
  },
  {
    letter: 'B', name: 'round speed plate', shape: 'circle', kind: 'speed',
    w: 48, top: -61, bottom: -17, scale: 0.92,
    face: CREAM_LIGHT, trim: '#b3483f', ink: '#81352f',
    label: 'SPEED', value: '55', labelCell: 0.69, valueCell: 2.24,
    note: 'Compact circular limit plate; the cleanest speed-first silhouette.'
  },
  {
    letter: 'C', name: 'highway shield', shape: 'shield', kind: 'highway',
    w: 58, top: -64, bottom: -21, scale: 0.84,
    face: GREEN_DARK, trim: CREAM, ink: '#fff1bd',
    label: 'HIGHWAY', value: '13', labelCell: 0.60, valueCell: 2.20,
    note: 'Tall shield with a clear route number; a more iconic highway read.'
  },
  {
    letter: 'D', name: 'detour arrow', shape: 'arrow', kind: 'highway',
    w: 78, top: -54, bottom: -25, scale: 0.86,
    face: ORANGE, trim: '#733f35', ink: '#fff0b4',
    label: 'DETOUR', value: 'EAST', labelCell: 0.67, valueCell: 1.16,
    note: 'Forward-pointing construction board; tests motion without a hazard sprite.'
  },
  {
    letter: 'E', name: 'scenic loop board', shape: 'rectangle', kind: 'highway',
    w: 78, top: -56, bottom: -25, scale: 0.82,
    face: BROWN, trim: CREAM, ink: '#f8e9b4',
    label: 'SCENIC', value: 'LOOP 7', labelCell: 0.78, valueCell: 1.44,
    note: 'Warm brown tourism board; gives the desert a small local voice.'
  },
  {
    letter: 'F', name: 'services board', shape: 'arrow', kind: 'highway',
    w: 82, top: -55, bottom: -24, scale: 0.80,
    face: BLUE, trim: CREAM, ink: '#f5efc6',
    label: 'SERVICES', value: '3.2 KM', labelCell: 0.58, valueCell: 1.62,
    note: 'Cool blue roadside service marker; tests palette contrast against clay.'
  },
  {
    letter: 'G', name: 'kilometer marker', shape: 'milepost', kind: 'highway',
    w: 30, top: -67, bottom: -22, scale: 0.91,
    face: GREEN_DARK, trim: CREAM, ink: '#fff1bd',
    label: 'KM', value: '404', labelCell: 0.58, valueCell: 1.70,
    note: 'Narrow tall marker; tests a small-scale vertical sign rhythm.'
  },
  {
    letter: 'H', name: 'bridge warning', shape: 'diamond', kind: 'caution',
    w: 54, top: -62, bottom: -14, scale: 0.78,
    face: YELLOW, trim: '#775a3f', ink: INK, showText: true,
    label: 'BRIDGE', value: '0.4 KM', labelCell: 0.52, valueCell: 1.22,
    note: 'Yellow diamond with a bridge cue; tests a less generic warning face.'
  },
  {
    letter: 'I', name: 'road-work warning', shape: 'diamond', kind: 'caution',
    w: 58, top: -64, bottom: -12, scale: 0.74,
    face: ORANGE, trim: '#733f35', ink: '#fff0b4', showText: true,
    label: 'ROAD WORK', value: 'AHEAD', labelCell: 0.45, valueCell: 0.86,
    note: 'Orange construction diamond; tests a hotter warning accent.'
  },
  {
    letter: 'J', name: 'infinite exit', shape: 'rectangle', kind: 'exit',
    w: 76, top: -56, bottom: -25, scale: 0.82,
    face: GREEN, trim: CREAM, ink: '#fff1bd',
    label: 'NEXT EXIT', value: '∞', labelCell: 0.65, valueCell: 2.16,
    note: 'Long green exit board with the cabinet’s deliberately wrong distance.'
  },
  {
    letter: 'K', name: 'autobahn symbol', shape: 'autobahn', kind: 'route',
    w: 62, top: -74, bottom: -12, scale: 0.80,
    face: '#154889', trim: '#ffffff', ink: '#ffffff', icon: '#ffffff',
    label: '', value: '', labelCell: 0, valueCell: 0,
    note: 'SHIPPED — square blue German motorway panel with the white road-and-overpass symbol.'
  },
]);
