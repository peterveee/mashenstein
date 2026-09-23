// Space props enter the ordinary supersampled prop cache and world renderer.
// Coordinates are normalized: authoring detail never changes collision size.
function plate(c, x, y, w, h, color, r = 0.04) {
  c.fillStyle = color;
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}
export const GRAVITY_PAINTERS = {
  magCargo(c, w, h) {
    c.save(); c.scale(w, h);
    plate(c, 0.03, 0.03, 0.94, 0.94, '#a7b6bf');
    plate(c, 0.11, 0.1, 0.78, 0.72, '#314b61');
    for (const x of [0.13, 0.77]) {
      plate(c, x, 0.03, 0.1, 0.94, '#e0a859', 0.01);
      for (const y of [0.14, 0.75]) plate(c, x + 0.025, y, 0.05, 0.045, '#283b49', 0.01);
    }
    plate(c, 0.36, 0.32, 0.28, 0.19, '#c6d9da', 0.01);
    plate(c, 0.41, 0.35, 0.04, 0.12, '#304e62', 0);
    plate(c, 0.52, 0.35, 0.07, 0.12, '#304e62', 0);
    plate(c, 0.33, 0.68, 0.34, 0.045, '#b2f989', 0.01);
    plate(c, 0, 0.91, 1, 0.09, '#80e4dc', 0.02);
    c.restore();
  },
  oxygenRack(c, w, h) {
    c.save(); c.scale(w, h);
    for (const x of [0.12, 0.54]) {
      plate(c, x, 0.13, 0.32, 0.82, '#d3e2df', 0.13);
      plate(c, x + 0.07, 0.18, 0.045, 0.62, '#f3f9f0', 0.02);
      plate(c, x, 0.35, 0.32, 0.15, '#569aab', 0.01);
      plate(c, x + 0.1, 0.02, 0.12, 0.17, '#c5864e', 0.02);
      plate(c, x + 0.06, 0.02, 0.2, 0.035, '#e6b36f', 0.01);
    }
    plate(c, 0.04, 0.9, 0.92, 0.1, '#687f92', 0.01);
    plate(c, 0.06, 0.67, 0.88, 0.065, '#466071', 0.01);
    c.restore();
  },
  serviceLaser(c, w, h) {
    c.save(); c.scale(w, h);
    plate(c, 0, 0.03, 1, 0.38, '#778e9e');
    plate(c, 0.08, 0.12, 0.84, 0.13, '#243d4d');
    plate(c, 0.05, 0.25, 0.15, 0.7, '#a4b9c2');
    plate(c, 0.8, 0.25, 0.15, 0.7, '#a4b9c2');
    plate(c, 0.15, 0.52, 0.7, 0.23, '#fa647b50');
    plate(c, 0.16, 0.6, 0.68, 0.06, '#ffc3cf', 0.01);
    for (const x of [0.08, 0.83]) plate(c, x, 0.49, 0.09, 0.24, '#ff9c4c', 0.01);
    c.restore();
  },
};
