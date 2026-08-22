// Waveform silhouettes shared by the compact voice editor and the full preset
// editor. Keeping the paths in one place means a waveform has the same visual
// language wherever it is chosen.
export const WAVE_GLYPHS = Object.freeze({
  sine: 'M1,7 C3,0.5 6,0.5 8,7 C10,13.5 13,13.5 15,7 C17,0.5 20,0.5 22,7',
  square: 'M1,12 L1,2.5 L8,2.5 L8,12 L15,12 L15,2.5 L22,2.5 L22,12',
  sawtooth: 'M1,12 L7,2.5 L7,12 L13,2.5 L13,12 L19,2.5 L19,12 L23,9',
  triangle: 'M1,12 L6,2.5 L11,12 L16,2.5 L21,12',
  pulse: 'M1,12 L1,2.5 L5,2.5 L5,12 L12,12 L12,2.5 L16,2.5 L16,12 L22,12',
  pwm: 'M1,12 L1,2.5 L3,2.5 L3,12 L8,12 L8,2.5 L12,2.5 L12,12 L16,12 L16,2.5 L22,2.5 L22,12 L23,12',
  noise: 'M1,7 L3,3 L5,11 L7,4.5 L9,12 L11,3.5 L13,9 L15,2.5 L17,10.5 L19,5 L21,11.5 L23,6.5',
  saw: 'M1,12 L7,2.5 L7,12 L13,2.5 L13,12 L19,2.5 L19,12 L23,9',
  samplehold: 'M1,9 L5,9 L5,4 L9,4 L9,11.5 L13,11.5 L13,6 L17,6 L17,2.5 L21,2.5 L21,8.5 L23,8.5',
});

/** Create the small, accessible SVG used inside a waveform choice button. */
export const makeWaveGlyph = (path, className = 'waveglyph') => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 14');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '14');
  svg.classList.add(className);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', path);
  svg.append(line);
  return svg;
};
