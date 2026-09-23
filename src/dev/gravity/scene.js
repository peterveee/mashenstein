import { GRAVITY_LEVEL as L, GATES } from './model.js';
const cyan = '#67e7e5', orange = '#ff9c4c', green = '#b2f989';
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
function line(c, x, y, xx, yy, ink, width = 1) { c.strokeStyle = ink; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
function label(c, text, x, y, size = 4, color = cyan) { c.fillStyle = color; c.font = `bold ${size}px monospace`; c.fillText(text, x, y); }
function panel(c, x, y, w, h, color, radius = 2) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill(); }
function planet(c, x, y, t) {
  c.save(); c.translate(x, y); c.rotate(-0.32);
  const ry = 5.5 + Math.sin(t / 18 * Math.PI * 2) * 0.5;
  for (let i = 0; i < 8; i++) { c.strokeStyle = i === 4 ? '#090d1a' : ['#77786f', '#b5ad8e', '#545f6a'][i % 3]; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, 0, 17 + i * 1.1, ry + i * 0.27, 0, 0, Math.PI * 2); c.stroke(); }
  const gr = c.createRadialGradient(-3, -3, 0, 0, 0, 9); gr.addColorStop(0, '#e3d5b0'); gr.addColorStop(0.7, '#b0a58a'); gr.addColorStop(1, '#47495e');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.clip();
  for (let b = -6; b < 8; b += 3) line(c, -9, b, 9, b + 1, '#807d7470', 1.2);
  for (let i = 0; i < 2; i++) { const phase = t / 31 * Math.PI * 2 + i * Math.PI; if (Math.cos(phase) > 0) { c.fillStyle = '#ebd9b0'; c.beginPath(); c.ellipse(Math.sin(phase) * 7, i ? 3 : -3, 1.9 * Math.cos(phase), 0.6, 0, 0, Math.PI * 2); c.fill(); } }
  c.restore();
  for (let i = 0; i < 8; i++) { c.strokeStyle = i === 4 ? '#111626' : ['#8f9081', '#d0c7a5', '#687382'][i % 3]; c.lineWidth = 0.75; c.beginPath(); c.ellipse(0, 0, 17 + i * 1.1, ry + i * 0.27, 0, 0, Math.PI); c.stroke(); }
  c.restore();
}
function vista(c, cam, width, t) {
  const g = c.createLinearGradient(0, -137, 0, 0); g.addColorStop(0, '#030812'); g.addColorStop(0.8, '#152330'); g.addColorStop(1, '#646a77'); c.fillStyle = g; c.fillRect(0, -137, width, 137);
  for (let i = 0; i < 90; i++) { const x = ((hash(i) * 550 - cam * 0.015) % 550 + 550) % 550; c.fillStyle = `rgba(212,237,255,${0.3 + hash(i + 90) * 0.6})`; c.fillRect(x, -133 + hash(i + 300) * 92, 0.5, 0.5); }
  // A distant body drifts much more slowly than the station windows. Tie
  // the traverse to progress so pausing does not send it out of composition.
  const progress = Math.max(0, Math.min(1, cam / L.length));
  const visibleWidth = Math.max(60, width - 60);
  planet(c, visibleWidth * (0.82 - 0.5 * progress), -103 + progress * 3, t);
  for (let i = 0; i < 3; i++) { const x = ((i * 113 + t * 1.3 - cam * 0.02) % 390 + 390) % 390; line(c, x, -88 + i * 17, x - 13, -93 + i * 17, '#b3e7ff40', 0.6); }
  for (const [f, base, amp, ink] of [[0.03,-24,23,'#293441'],[0.065,-21,19,'#3d4651'],[0.12,-9,15,'#626875']]) {
    c.beginPath(); c.moveTo(-60, 5);
    const shift = cam * f;
    for (let x = -60; x <= width + 60; x += 4) { const wx = x + shift; c.lineTo(x, base - amp * (0.45 + 0.27 * Math.sin(wx / 33) + 0.2 * Math.sin(wx / 17))); }
    c.lineTo(width + 60, 5); c.closePath(); c.fillStyle = ink; c.fill();
    c.save(); c.clip();
    for (let x = -60; x < width + 60; x += 21) line(c, x, -45, x + 19, 1, '#ccd5da0c', 5);
    c.restore();
  }
  for (let i = 0; i < 20; i++) { const x = ((i * 27 - cam * 0.16) % 560 + 560) % 560; c.strokeStyle = '#303a4890'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(x, -2 - hash(i + 7) * 7, 2 + hash(i) * 3, 0.8, 0, 0, Math.PI * 2); c.stroke(); }
}
function gate(c, g, cam, t, top, bottom, hint) {
  const x = g.x - cam;
  // The mast and drive share the gate's world transform, never parallax.
  for (const [a, b] of [[top, -149], [12, bottom]]) {
    panel(c, x - 8, a, 16, b - a, '#172c38', 0);
    for (let y = a; y < b; y += 14) { line(c, x - 7, y, x + 7, Math.min(b, y + 14), '#395566'); line(c, x + 7, y, x - 7, Math.min(b, y + 14), '#395566'); }
    line(c, x - 9, a, x - 9, b, orange, 1.2); line(c, x + 9, a, x + 9, b, orange, 1.2);
  }
  panel(c, x - 13, -176, 26, 16, '#344654'); label(c, 'POLARITY', x - 11, -166, 3.2, '#c6e9e8');
  c.fillStyle = Math.sin(t * 4) > 0 ? orange : '#5d4330'; c.beginPath(); c.arc(x, -180, 2, 0, 7); c.fill();
  for (const dx of [-L.arrowLeftOffset]) { line(c, x + dx, -135, x + dx, -2, orange, 2); panel(c, x + dx - 3, -137, 6, 4, '#dedbc0', 0.5); panel(c, x + dx - 3, -4, 6, 4, '#dedbc0', 0.5); }
  // A lit glass edge dissolves across the active side of the marker.
  const glass = c.createLinearGradient(x - 12, 0, x + 23, 0);
  glass.addColorStop(0, 'rgba(136,231,226,0.24)');
  glass.addColorStop(0.12, 'rgba(116,209,218,0.15)');
  glass.addColorStop(0.55, 'rgba(105,197,207,0.065)');
  glass.addColorStop(1, 'rgba(105,197,207,0)');
  c.fillStyle = glass; c.fillRect(x - 12, -133, 35, 129);
  line(c, x - 11.5, -132, x - 11.5, -5, '#d4fff845', 0.5);
  const dir = g.lane ? -1 : 1;
  c.save();
  c.beginPath(); c.rect(x - 8, -133, 16, 129); c.clip();
  c.strokeStyle = green; c.lineWidth = 1.8;
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const y = -8 - ((i * 16 + t * dir * -23) % 126 + 126) % 126;
    c.beginPath(); c.moveTo(x - 5, y - dir * 3);
    c.lineTo(x, y + dir * 2); c.lineTo(x + 5, y - dir * 3); c.stroke();
  }
  c.restore();
  label(c, g.lane ? 'UP' : 'DOWN', x - 5, -143, 4, green);
  if (hint) {
    const y = g.lane ? -30 : -105;
    panel(c, x + 8, y - 10, 30, 14, '#172c38');
    label(c, 'JUMP', x + 11, y, 7, green);
  }
}
// Called by the style pack in the normal RunState world transform. No camera,
// HUD, actor or entity rendering lives here.
export function drawGravityRoom(c, { cam, view, top, bottom, time, gates = GATES, hintGates = new Set() }) {
  const m = { time };
  c.fillStyle = '#0b1723'; c.fillRect(0, top, view, bottom - top);
  // Roof ribs and grated service deck occupy the extra portrait frame.
  for (let i = Math.floor(cam / 48) - 1; i * 48 < cam + view + 48; i++) {
    const x = i * 48 - cam;
    panel(c,x,top,3,Math.max(0,-149-top),'#233545',0);
    panel(c,x,16,40,Math.max(0,bottom-16),'#101e2b',0);
    for (let y = 25; y < bottom; y += 22) { panel(c,x+5,y,29,13,'#233c4b'); line(c,x+8,y+4,x+26,y+4,'#455e69',1); c.fillStyle=green;c.fillRect(x+29,y+8,2,1); }
    c.strokeStyle='#c9925160';c.lineWidth=1;c.beginPath();c.moveTo(x,20);c.quadraticCurveTo(x+24,48,x+48,20);c.stroke();
  }
  // Rounded windows sit inside a solid hull, clear of both running rails.
  const start = Math.floor(cam / 97.5) - 1;
  const panes = [];
  for (let i = start; i * 97.5 < cam + view + 98; i++) panes.push(i * 97.5 - cam + 1.75);
  const paneTop = -123, paneHeight = 109, radius = 7.5;
  c.save(); c.beginPath();
  for (const x of panes) c.roundRect(x, paneTop, 94, paneHeight, radius);
  c.clip(); vista(c, cam, view, m.time); c.restore();
  for (const x of panes) {
    c.save(); c.beginPath(); c.roundRect(x, paneTop, 94, paneHeight, radius); c.clip();
    c.fillStyle = '#5597aa0b'; c.fillRect(x, paneTop, 94, paneHeight);
    for (const dx of [17,29]) {
      c.fillStyle = dx === 17 ? '#ccefff0b' : '#ccefff06'; c.beginPath();
      c.moveTo(x + dx, paneTop); c.lineTo(x + dx + 8, paneTop);
      c.lineTo(x + dx - 25, -14); c.lineTo(x + dx - 33, -14); c.fill();
    }
    c.restore();
    c.strokeStyle = '#304f60'; c.lineWidth = 3.2;
    c.beginPath(); c.roundRect(x, paneTop, 94, paneHeight, radius); c.stroke();
    c.strokeStyle = '#83bdc18c'; c.lineWidth = 0.7;
    c.beginPath(); c.roundRect(x, paneTop, 94, paneHeight, radius); c.stroke();
    c.strokeStyle = '#132532'; c.lineWidth = 1.2;
    c.beginPath(); c.roundRect(x + 2.1, paneTop + 2.1, 89.8, paneHeight - 4.2, radius - 1.5); c.stroke();
  }
  for (const y of [-149,0]) { panel(c,0,y,view,12,'#1a3546',0); line(c,0,y===0?0:-137,view,y===0?0:-137,cyan,1); for(let i=Math.floor(cam/18);i*18<cam+view+18;i++) { const x=i*18-cam;line(c,x,y+3,x+10,y+3,'#456775',0.6);c.fillStyle=orange;c.fillRect(x,y+7,3,1); } }
  for (const [i, wx] of [1420, 2980].entries()) {
    if (wx > cam - 30 && wx < cam + view + 30) label(c, `SECTOR 0${i + 2}`, wx - cam - 15, -142, 3.5, green);
  }
  for(const g of gates)if(Math.abs(g.x-cam-view/2)<view/2+30)gate(c,g,cam,m.time,top,bottom,hintGates.has(g.index));
}
