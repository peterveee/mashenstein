import { GRAVITY_LEVEL as L, GATES } from './model.js';
const cyan = '#67e7e5', orange = '#ff9c4c', green = '#b2f989';
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
function line(c, x, y, xx, yy, ink, width = 1) { c.strokeStyle = ink; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
function label(c, text, x, y, size = 4, color = cyan) { c.fillStyle = color; c.font = `bold ${size}px monospace`; c.fillText(text, x, y); }
function panel(c, x, y, w, h, color, radius = 2) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill(); }
function planet(c, x, y) {
  c.save(); c.translate(x, y); c.rotate(-0.32);
  // Filled, concentric annuli share one projected plane. Paint the near
  // half over the globe; the far half is naturally hidden behind it.
  function ring(inner, outer, ink, front) {
    c.fillStyle = ink; c.beginPath();
    c.ellipse(0, 0, outer, outer * 0.34, 0, 0, front ? Math.PI : Math.PI * 2);
    c.ellipse(0, 0, inner, inner * 0.34, 0, front ? Math.PI : Math.PI * 2, 0, true);
    c.closePath(); c.fill('evenodd');
  }
  function rings(front) {
    ring(12.4, 15.3, front ? '#8b887d' : '#62666a', front);
    ring(15.3, 19.7, front ? '#c2b89c' : '#978f7d', front);
    // One narrow division, rather than black gaps between every ring.
    ring(20.2, 23, front ? '#99998b' : '#646b70', front);
    for (const r of [16.1, 17.6, 18.8, 21.4, 22.5]) ring(r, r + 0.13, '#dfd3b844', front);
  }
  rings(false);
  c.save(); c.beginPath(); c.ellipse(0, 0, 10.2, 9.2, 0, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#b9aa86'; c.fillRect(-11, -10, 22, 20);
  for (const [yy, ink, w] of [[-6,'#e0c99e',1.1],[-3.8,'#cbb88e',1.8],[-1.3,'#a89270',1.2],[1,'#cfba91',2.2],[4,'#a49071',1.3],[6.4,'#c2ad85',1]]) {
    c.strokeStyle = ink; c.lineWidth = w; c.beginPath(); c.moveTo(-11, yy);
    c.bezierCurveTo(-4, yy + 0.7, 4, yy + 0.7, 11, yy); c.stroke();
  }
  const light = c.createRadialGradient(-4, -4, 1, -2, -2, 13);
  light.addColorStop(0, '#fff2cd66'); light.addColorStop(0.48, '#fff2cd0a');
  light.addColorStop(0.8, '#252d3d70'); light.addColorStop(1, '#111c30dc');
  c.fillStyle = light; c.fillRect(-11, -10, 22, 20);
  // The rings cast a restrained equatorial shadow on the globe.
  c.strokeStyle = '#28303b44'; c.lineWidth = 0.65;
  c.beginPath(); c.ellipse(0, -0.5, 15.3, 5.2, 0, 0, Math.PI); c.stroke();
  c.restore(); rings(true); c.restore();
}
function asteroids(c, width, t) {
  // One short fly-by every 7–9 seconds, with quiet sky between visits.
  // Time-derived variation remains deterministic through pause and rewind.
  const cycle = 8.5, event = Math.floor(t / cycle);
  const age = t - event * cycle - (1.1 + hash(event + 601) * 2);
  const duration = 1.05 + hash(event + 617) * 0.45;
  if (age < 0 || age > duration) return;
  const u = age / duration, span = Math.max(60, width - 60);
  const x = span + 28 - u * (span + 56);
  const y = -106 + hash(event + 631) * 40 + u * 23;
  const size = 1.3 + hash(event + 647) * 1.4;
  c.save();
  const trail = c.createLinearGradient(x, y, x + 23, y - 6);
  trail.addColorStop(0, '#b4bfc47a'); trail.addColorStop(1, '#a8c6de00');
  c.strokeStyle = trail; c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + 23, y - 6); c.stroke();
  c.translate(x, y); c.rotate(age * 3.6 + event);
  c.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, r = size * (0.72 + hash(i + event * 7) * 0.35);
    if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath(); c.fillStyle = '#8b929b'; c.fill();
  c.strokeStyle = '#c0c3bd'; c.lineWidth = 0.35; c.stroke();
  c.fillStyle = '#454e5b'; c.beginPath(); c.ellipse(size * 0.2, 0, size * 0.32, size * 0.22, 0.4, 0, Math.PI * 2); c.fill();
  c.restore();
}
function vista(c, cam, width, t) {
  const g = c.createLinearGradient(0, -137, 0, 0); g.addColorStop(0, '#030812'); g.addColorStop(0.8, '#152330'); g.addColorStop(1, '#646a77'); c.fillStyle = g; c.fillRect(0, -137, width, 137);
  for (let i = 0; i < 90; i++) { const x = ((hash(i) * 550 - cam * 0.015) % 550 + 550) % 550; c.fillStyle = `rgba(212,237,255,${0.3 + hash(i + 90) * 0.6})`; c.fillRect(x, -133 + hash(i + 300) * 92, 0.5, 0.5); }
  // A distant body drifts much more slowly than the station windows. Tie
  // the traverse to progress so pausing does not send it out of composition.
  const progress = Math.max(0, Math.min(1, cam / L.length));
  const visibleWidth = Math.max(60, width - 60);
  planet(c, visibleWidth * (0.82 - 0.5 * progress), -103 + progress * 3);
  asteroids(c, width, t);
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
  const chevronAlpha = c.globalAlpha;
  for (let i = 0; i < 8; i++) {
    const y = -8 - ((i * 16 + t * dir * -23) % 126 + 126) % 126;
    const height = Math.max(0, Math.min(1, (-y - 4) / 129));
    const strength = g.lane ? height : 1 - height;
    c.globalAlpha = chevronAlpha * (0.06 + 0.94 * strength);
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
  const start = Math.floor(cam / 102) - 1;
  const panes = [];
  for (let i = start; i * 102 < cam + view + 102; i++) panes.push(i * 102 - cam + 4);
  const paneTop = -127, paneHeight = 117, radius = 7.5;
  c.save(); c.beginPath();
  for (const x of panes) c.roundRect(x, paneTop, 94, paneHeight, radius);
  c.clip(); vista(c, cam, view, m.time); c.restore();
  for (const x of panes) {
    c.save(); c.beginPath(); c.roundRect(x, paneTop, 94, paneHeight, radius); c.clip();
    c.fillStyle = '#5597aa0b'; c.fillRect(x, paneTop, 94, paneHeight);
    for (const dx of [17,29]) {
      c.fillStyle = dx === 17 ? '#ccefff0b' : '#ccefff06'; c.beginPath();
      c.moveTo(x + dx, paneTop); c.lineTo(x + dx + 8, paneTop);
      c.lineTo(x + dx - 25, -10); c.lineTo(x + dx - 33, -10); c.fill();
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
